const axios = require('axios');
const { pool } = require('../config/database');
const logger = require('../utils/logger');
const { calculateFingerprint, normalizeFinding } = require('./findingUtils');

function markdownEscape(text) {
  return String(text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function summarizeFindings(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  const categories = {};
  for (const finding of findings) {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1;
    categories[finding.category] = (categories[finding.category] || 0) + 1;
  }
  return { counts, categories };
}

function buildSummaryComment(prNumber, findings, runId) {
  const { counts, categories } = summarizeFindings(findings);
  const topFindings = findings
    .filter((f) => Number(f.confidence) >= 0.55)
    .sort((a, b) => Number(b.confidence) - Number(a.confidence))
    .slice(0, 8);

  const categoryLine = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name}: ${count}`)
    .join(' | ');

  return [
    `<!-- codesentry-summary:${prNumber} -->`,
    '## CodeSentry Security Review',
    '',
    `Run: \`${runId}\``,
    `Total findings: **${findings.length}**`,
    `Critical: **${counts.critical || 0}**, High: **${counts.high || 0}**, Medium: **${counts.medium || 0}**, Low: **${counts.low || 0}**`,
    '',
    categoryLine ? `Categories: ${categoryLine}` : null,
    '',
    '### High-signal findings',
    ...topFindings.map(
      (f) =>
        `- **${markdownEscape(f.title)}** (${f.severity}, confidence ${Math.round(
          Number(f.confidence) * 100
        )}%) in \`${markdownEscape(f.file_path)}:${f.line_start || '?'}\``
    ),
    '',
    '_Inline comments are posted only for high-confidence findings._',
  ]
    .filter(Boolean)
    .join('\n');
}

async function githubServiceRequest(path, payload) {
  const baseUrl = process.env.GITHUB_SERVICE_URL || 'http://github-service:3002';
  const internalSecret = process.env.GITHUB_SERVICE_INTERNAL_SECRET;
  if (!internalSecret) {
    throw new Error('Missing GITHUB_SERVICE_INTERNAL_SECRET');
  }
  const response = await axios.post(`${baseUrl}${path}`, payload, {
    timeout: 45000,
    headers: { 'x-internal-secret': internalSecret },
  });
  return response.data;
}

async function upsertFinding({
  finding,
  runId,
  pullRequestId,
  repositoryId,
  installationId,
  prNumber,
  commitSha,
  isBaseline,
}) {
  const normalized = normalizeFinding(finding);
  const fingerprint = calculateFingerprint(normalized);

  const existing = await pool.query('SELECT id FROM findings WHERE fingerprint = $1', [fingerprint]);
  if (existing.rowCount > 0) {
    const updated = await pool.query(
      `UPDATE findings
       SET analysis_run_id = $1,
           pull_request_id = $2,
           pull_request_number = $3,
           commit_sha = $4,
           title = $5,
           description = $6,
           category = $7,
           cwe_id = $8,
           owasp_category = $9,
           severity = $10,
           confidence = $11,
           exploitability = $12,
           file_path = $13,
           line_start = $14,
           line_end = $15,
           code_snippet = $16,
           evidence = $17,
           exploit_scenario = $18,
           remediation = $19,
           remediation_patch = $20,
           last_seen_at = NOW(),
           updated_at = NOW(),
           status = CASE WHEN status = 'fixed' THEN 'open' ELSE status END
       WHERE id = $21
       RETURNING *`,
      [
        runId,
        pullRequestId,
        prNumber,
        commitSha,
        normalized.title,
        normalized.description,
        normalized.category,
        normalized.cwe_id || null,
        normalized.owasp_category || null,
        normalized.severity,
        Number(normalized.confidence || 0.4),
        normalized.exploitability || 'medium',
        normalized.file_path,
        normalized.line_start || null,
        normalized.line_end || null,
        normalized.code_snippet || null,
        normalized.evidence || null,
        normalized.exploit_scenario || null,
        normalized.remediation || null,
        normalized.remediation_patch_optional || null,
        existing.rows[0].id,
      ]
    );
    return updated.rows[0];
  }

  const inserted = await pool.query(
    `INSERT INTO findings (
      repository_id, installation_id, pull_request_number, pull_request_id, analysis_run_id, commit_sha,
      fingerprint, rule_id, title, description, category, cwe_id, owasp_category,
      severity, confidence, exploitability, file_path, line_start, line_end,
      code_snippet, evidence, exploit_scenario, remediation, remediation_patch, status,
      is_baseline, first_seen_at, last_seen_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18, $19,
      $20, $21, $22, $23, $24, 'open',
      $25, NOW(), NOW()
    )
    RETURNING *`,
    [
      repositoryId,
      installationId,
      prNumber,
      pullRequestId,
      runId,
      commitSha,
      fingerprint,
      normalized.rule_id,
      normalized.title,
      normalized.description,
      normalized.category,
      normalized.cwe_id || null,
      normalized.owasp_category || null,
      normalized.severity,
      Number(normalized.confidence || 0.4),
      normalized.exploitability || 'medium',
      normalized.file_path,
      normalized.line_start || null,
      normalized.line_end || null,
      normalized.code_snippet || null,
      normalized.evidence || null,
      normalized.exploit_scenario || null,
      normalized.remediation || null,
      normalized.remediation_patch_optional || null,
      isBaseline,
    ]
  );
  return inserted.rows[0];
}

async function applySuppressions(findingRows, repositoryId) {
  const suppressions = await pool.query(
    `SELECT fingerprint, reason
     FROM suppressions
     WHERE repository_id = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
    [repositoryId]
  );
  const byFingerprint = new Map(suppressions.rows.map((row) => [row.fingerprint, row]));
  const result = [];
  for (const finding of findingRows) {
    const suppression = byFingerprint.get(finding.fingerprint);
    if (suppression) {
      await pool.query(
        `UPDATE findings
         SET status = 'dismissed', dismissal_reason = $1, updated_at = NOW()
         WHERE id = $2`,
        [suppression.reason, finding.id]
      );
      result.push({ ...finding, status: 'dismissed', dismissal_reason: suppression.reason });
    } else {
      result.push(finding);
    }
  }
  return result;
}

async function markFixedFindings({ repositoryId, pullRequestId, activeFingerprints }) {
  if (activeFingerprints.length === 0) {
    await pool.query(
      `UPDATE findings
       SET status = 'fixed', updated_at = NOW()
       WHERE repository_id = $1 AND pull_request_id = $2 AND status = 'open'`,
      [repositoryId, pullRequestId]
    );
    return;
  }
  await pool.query(
    `UPDATE findings
     SET status = 'fixed', updated_at = NOW()
     WHERE repository_id = $1
       AND pull_request_id = $2
       AND status = 'open'
       AND fingerprint <> ALL($3::text[])`,
    [repositoryId, pullRequestId, activeFingerprints]
  );
}

async function runAnalysisJob(payload) {
  const {
    analysis_run_id: runId,
    repository_id: repositoryId,
    repository_full_name: repositoryFullName,
    installation_id: installationId,
    pull_request_id: pullRequestId,
    pull_request_number: prNumber,
    commit_sha: commitSha,
    baseline_set: baselineSet,
  } = payload;
  const [owner, repo] = repositoryFullName.split('/');

  try {
    const filesResp = await githubServiceRequest('/internal/github/pulls/files', {
      repository_full_name: repositoryFullName,
      pull_request_number: prNumber,
      installation_id: installationId,
    });
    const files = filesResp.files || [];

    const analysisResp = await axios.post(
      `${process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:8001'}/analyze/pr`,
      {
        repository_full_name: repositoryFullName,
        pull_request_number: prNumber,
        commit_sha: commitSha,
        files,
      },
      { timeout: 90000 }
    );

    const findings = analysisResp.data.findings || [];
    const runCountBefore = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM analysis_runs
       WHERE repository_id = $1 AND id <> $2 AND status = 'completed'`,
      [repositoryId, runId]
    );
    const isInitialBaselineRun = !baselineSet && Number(runCountBefore.rows[0].count) === 0;

    const persisted = [];
    for (const finding of findings) {
      const saved = await upsertFinding({
        finding,
        runId,
        pullRequestId,
        repositoryId,
        installationId,
        prNumber,
        commitSha,
        isBaseline: isInitialBaselineRun,
      });
      persisted.push(saved);
    }

    const activeFingerprints = persisted.map((f) => f.fingerprint);
    await markFixedFindings({ repositoryId, pullRequestId, activeFingerprints });

    const postSuppression = await applySuppressions(persisted, repositoryId);
    const actionable = postSuppression.filter((f) => f.status === 'open' && !f.is_baseline);

    const summaryBody = buildSummaryComment(prNumber, actionable, runId);
    const summaryResp = await githubServiceRequest('/internal/github/comments/summary-upsert', {
      owner,
      repo,
      pr_number: prNumber,
      installation_id: installationId,
      marker: `<!-- codesentry-summary:${prNumber} -->`,
      body: summaryBody,
    });

    const inlineCandidates = actionable
      .filter((finding) => Number(finding.confidence) >= 0.8 && !finding.inline_comment_id)
      .map((finding) => ({
        finding_id: finding.id,
        file_path: finding.file_path,
        line_start: finding.line_start || 1,
        body: [
          `**${finding.title}**`,
          '',
          `Severity: **${finding.severity}** | Confidence: **${Math.round(Number(finding.confidence) * 100)}%**`,
          '',
          finding.evidence || finding.description,
          '',
          `Exploitability: ${finding.exploitability || 'medium'}`,
          '',
          `Remediation: ${finding.remediation || 'Apply input validation and secure handling.'}`,
        ].join('\n'),
      }));

    if (inlineCandidates.length > 0) {
      const inlineResp = await githubServiceRequest('/internal/github/comments/inline', {
        owner,
        repo,
        pr_number: prNumber,
        installation_id: installationId,
        commit_sha: commitSha,
        findings: inlineCandidates,
      });
      for (const posted of inlineResp.posted || []) {
        await pool.query('UPDATE findings SET inline_comment_id = $1 WHERE id = $2', [
          posted.comment_id,
          posted.finding_id,
        ]);
      }
    }

    const counts = summarizeFindings(actionable).counts;
    const highOrCritical = (counts.critical || 0) + (counts.high || 0);
    const checkRunResp = await githubServiceRequest('/internal/github/check-runs', {
      owner,
      repo,
      installation_id: installationId,
      head_sha: commitSha,
      conclusion: highOrCritical > 0 ? 'failure' : 'success',
      title: highOrCritical > 0 ? 'Security findings require attention' : 'No blocking security findings',
      summary: `CodeSentry found ${actionable.length} actionable findings (${counts.critical || 0} critical, ${counts.high || 0} high, ${counts.medium || 0} medium).`,
    });

    await pool.query(
      `UPDATE analysis_runs
       SET status = 'completed',
           findings_count = $2,
           critical_count = $3,
           high_count = $4,
           medium_count = $5,
           low_count = $6,
           files_analyzed = $7,
           github_check_run_id = $8,
           summary_comment_id = $9,
           completed_at = NOW()
       WHERE id = $1`,
      [
        runId,
        actionable.length,
        counts.critical || 0,
        counts.high || 0,
        counts.medium || 0,
        counts.low || 0,
        files.length,
        checkRunResp.check_run_id || null,
        summaryResp.comment_id || null,
      ]
    );

    if (isInitialBaselineRun) {
      await pool.query('UPDATE repositories SET baseline_set = true, updated_at = NOW() WHERE id = $1', [repositoryId]);
    }
  } catch (error) {
    logger.error('PR analysis orchestration failed', {
      runId,
      repositoryId,
      error: error.message,
    });
    await pool.query(
      `UPDATE analysis_runs
       SET status = 'failed', error_message = $2, completed_at = NOW()
       WHERE id = $1`,
      [runId, error.message]
    );
  }
}

function triggerAnalysisJob(payload) {
  setImmediate(() => {
    runAnalysisJob(payload).catch((error) => {
      logger.error('Unhandled analysis background failure', {
        runId: payload.analysis_run_id,
        error: error.message,
      });
    });
  });
}

module.exports = {
  triggerAnalysisJob,
};
