const prService = require('../services/prService');
const analysisClient = require('../services/analysisClient');
const githubCommentService = require('../services/githubCommentService');
const commentFormatter = require('../utils/commentFormatter');
const notificationService = require('../services/notificationService');
const githubAppAuth = require('../services/githubAppAuth');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL.includes('postgres:5432')) ? true : false,
});

function countBySeverity(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const finding of findings) {
    const severity = String(finding.severity || '').toLowerCase();
    if (counts[severity] !== undefined) {
      counts[severity] += 1;
    }
  }
  return counts;
}

class WebhookController {
  async processPullRequest(payload, action) {
    if (action !== 'opened' && action !== 'synchronize') {
      console.log(`[SKIP] Skipping ${action} event`);
      return;
    }

    const pr = payload.pull_request;
    const repository = payload.repository;

    let githubToken;
    try {
      const repoResult = await pool.query(
        'SELECT user_id FROM repositories WHERE github_id = $1',
        [repository.id]
      );

      if (repoResult.rows.length === 0) {
        console.error('[ERROR] Repository not found in database');
        return;
      }

      const userId = repoResult.rows[0].user_id;
      const userResult = await pool.query(
        'SELECT github_token FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        console.error('[ERROR] User not found in database');
        return;
      }

      githubToken = userResult.rows[0].github_token;
      if (!githubToken) {
        console.error('[ERROR] GitHub token not found for user');
        return;
      }
    } catch (error) {
      console.error('[ERROR] Failed to fetch GitHub token:', error.message);
      return;
    }

    let commentToken = null;
    let commentTokenSource = 'none';

    if (githubAppAuth.isConfigured()) {
      try {
        commentToken = await githubAppAuth.getInstallationToken();
        commentTokenSource = 'github_app';
        console.log('[AUTH] Using GitHub App installation token for comments');
      } catch (appErr) {
        console.warn(`[WARN] GitHub App token generation failed: ${appErr.message}`);
      }
    }

    if (!commentToken && process.env.GITHUB_BOT_TOKEN) {
      commentToken = process.env.GITHUB_BOT_TOKEN;
      commentTokenSource = 'bot_token';
      console.log('[AUTH] Using GITHUB_BOT_TOKEN for comments');
    }

    if (!commentToken) {
      console.warn('[WARN] No app/bot token available; skipping GitHub comments to avoid posting as user.');
    }

    const owner = repository.owner.login;
    const repoName = repository.name;

    const postSummaryWithFallback = async (body) => {
      if (!commentToken) {
        console.warn('[WARN] No app/bot token; posting with user token');
        return githubCommentService.postSummaryComment(owner, repoName, pr.number, body, githubToken);
      }

      try {
        return await githubCommentService.postSummaryComment(owner, repoName, pr.number, body, commentToken);
      } catch (error) {
        const status = error.response?.status;
        const detail = error.response?.data || error.message;
        console.error(`[ERROR] Failed to post summary comment with ${commentTokenSource} token (status ${status}):`, detail);

        const shouldFallback = commentToken !== githubToken && [401, 403, 404].includes(status);
        if (shouldFallback) {
          console.warn(`[WARN] Retrying comment with user token due to status ${status}`);
          return githubCommentService.postSummaryComment(owner, repoName, pr.number, body, githubToken);
        }

        throw error;
      }
    };

    console.log(`\n[START] Starting analysis for PR #${pr.number} in ${repository.full_name}`);

    try {
      const pythonFiles = await prService.getPythonFilesFromPR(pr.url, githubToken);

      if (pythonFiles.length === 0) {
        console.log('[INFO] No Python files found in this PR');
        return;
      }

      if (pythonFiles.length > 3) {
        try {
          const progressComment = `## 🔍 CodeSentry Analysis Started\n\n` +
            `Processing ${pythonFiles.length} Python ${pythonFiles.length === 1 ? 'file' : 'files'}...\n\n` +
            `This may take a few minutes. We'll post findings as we discover them.\n\n` +
            `<sub>Powered by **CodeSentry**</sub>`;

          await postSummaryWithFallback(progressComment);
          console.log(`[PROGRESS] Posted initial comment for ${pythonFiles.length} files`);
        } catch (error) {
          console.error('[WARN] Failed to post progress comment:', error.message);
        }
      }

      const allFindings = [];

      for (let i = 0; i < pythonFiles.length; i++) {
        const file = pythonFiles[i];
        console.log(`\n[FILE ${i + 1}/${pythonFiles.length}] Processing: ${file.filename}`);

        try {
          const fileContent = await prService.getFileContent(file, githubToken);
          const analysisResult = await analysisClient.analyzeCode(
            fileContent,
            file.filename,
            pr.number,
            repository.full_name
          );

          const findings = analysisResult.findings || [];
          if (findings.length > 0) {
            allFindings.push(...findings);
            console.log(`  [PR ANALYSIS] Posting all ${findings.length} findings`);

            try {
              const batchedComment = commentFormatter.formatBatchedSecurityComment(findings, file.filename);
              if (batchedComment) {
                await postSummaryWithFallback(batchedComment);
                console.log(`  [SECURITY] Posted comment with ${findings.length} findings to GitHub`);
              }
            } catch (error) {
              console.error('  [WARN] Failed to post batched security comment:', error.message);
            }
          }
        } catch (error) {
          console.error(`[ERROR] Failed to analyze ${file.filename}:`, error.message);
        }

        if (i < pythonFiles.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      try {
        console.log('\n[EMAIL] Preparing notification to reviewers...');
        const severityCounts = countBySeverity(allFindings);

        const prData = {
          repository: repository.full_name,
          pr_number: pr.number,
          pr_url: pr.html_url,
          pr_title: pr.title,
          author: pr.user.login,
          filesAnalyzed: pythonFiles.length,
          requested_reviewers: pr.requested_reviewers || [],
          repo_owner: repository.owner.login
        };

        const analysisResults = {
          total_findings: allFindings.length,
          critical_count: severityCounts.critical,
          high_count: severityCounts.high,
          medium_count: severityCounts.medium,
          low_count: severityCounts.low,
          findings: allFindings,
          hasCritical: severityCounts.critical > 0
        };

        await notificationService.notifyReviewers(prData, analysisResults);
        console.log('[EMAIL] Notification process complete');
      } catch (error) {
        console.error('[EMAIL] Failed to send notifications (PR analysis still succeeded):', error.message);
      }

      const highCount = allFindings.filter(
        (finding) => finding.severity === 'critical' || finding.severity === 'high'
      ).length;
      const totalFindings = allFindings.length;
      const clean = totalFindings === 0;

      const completionComment = clean
        ? `CodeSentry Analysis Complete ✅\n\n` +
          `Analyzed ${pythonFiles.length} Python ${pythonFiles.length === 1 ? 'file' : 'files'}.\n\n` +
          `No security findings detected in this PR.\n\n` +
          `<sub>Powered by CodeSentry</sub>`
        : `CodeSentry Analysis Complete ✅\n\n` +
          `Analyzed ${pythonFiles.length} Python ${pythonFiles.length === 1 ? 'file' : 'files'}\n\n` +
          `Summary:\n` +
          `- ⚠️ Critical/High Findings: ${highCount}\n` +
          `- 🔎 Total Security Findings: ${totalFindings}\n\n` +
          `${highCount > 0 ? 'Please review the critical/high severity issues posted above.' : 'No critical or high severity issues found.'}\n\n` +
          `<sub>Powered by CodeSentry</sub>`;

      try {
        await postSummaryWithFallback(completionComment);
        console.log('[PROGRESS] Posted final summary');
      } catch (error) {
        console.error('[WARN] Failed to post final summary comment:', error.message);
      }

      console.log(`\n[COMPLETE] PR analysis complete for #${pr.number}\n`);
    } catch (error) {
      console.error('[ERROR] PR analysis failed:', error);
    }
  }
}

module.exports = new WebhookController();
