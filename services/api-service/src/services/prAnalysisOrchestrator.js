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

function severityIcon(severity) {
  return { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵' }[severity] || '⚪';
}

function buildReviewBody(findings, runId) {
  const { counts } = summarizeFindings(findings);
  const total = findings.length;
  const hasBlocking = (counts.critical || 0) + (counts.high || 0) > 0;

  if (total === 0) {
    return [
      '<!-- codesentry-review -->',
      '### 🛡️ CodeSentry — No security issues found',
      '',
      'This PR passed all security checks.',
      '',
      `<sub>Run \`${runId.slice(0, 8)}\`</sub>`,
    ].join('\n');
  }

  return [
    '<!-- codesentry-review -->',
    `### 🛡️ CodeSentry — ${total} finding${total === 1 ? '' : 's'} detected`,
    '',
    hasBlocking ? '**Resolve critical and high severity issues before merging.**' : 'No blocking issues. Review at your discretion.',
    '',
    `| ${severityIcon('critical')} Critical | ${severityIcon('high')} High | ${severityIcon('medium')} Medium | ${severityIcon('low')} Low |`,
    '|---|---|---|---|',
    `| **${counts.critical || 0}** | **${counts.high || 0}** | **${counts.medium || 0}** | **${counts.low || 0}** |`,
    '',
    `<sub>Analyzed by <strong>CodeSentry</strong> · Run \`${runId.slice(0, 8)}\` · Findings are annotated on the affected lines below</sub>`,
  ].join('\n');
}

function buildReviewComment(finding) {
  return [
    `${severityIcon(finding.severity)} **${finding.severity.toUpperCase()}** — ${markdownEscape(finding.title)}`,
    '',
    `> ${markdownEscape(finding.evidence || finding.description)}`,
    '',
    finding.cwe_id ? `**CWE:** ${finding.cwe_id}` : null,
    `**Confidence:** ${Math.round(Number(finding.confidence) * 100)}%`,
    '',
    `**Fix:** ${markdownEscape(finding.remediation || 'Apply input validation and secure handling.')}`,
  ].filter(Boolean).join('\n');
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
  const fingerprint = normalized.fingerprint || calculateFingerprint(normalized);

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
           is_baseline = $21,
           last_seen_at = NOW(),
           updated_at = NOW(),
           status = CASE WHEN status = 'fixed' THEN 'open' ELSE status END
       WHERE id = $22
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
        normalized.remediation_patch || null,
        isBaseline,
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
      normalized.remediation_patch || null,
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

    // Submit PR review — single atomic action: summary + inline annotations + verdict
    const counts = summarizeFindings(actionable).counts;
    const highOrCritical = (counts.critical || 0) + (counts.high || 0);
    let reviewResp = {};
    let checkRunResp = {};

    try {
      const reviewBody = buildReviewBody(actionable, runId);
      const diffPaths = new Set(files.map((f) => f.path));
      const reviewComments = actionable
        .filter((f) => Number(f.confidence) >= 0.7 && diffPaths.has(f.file_path))
        .map((f) => ({
          path: f.file_path,
          line: f.line_start || 1,
          body: buildReviewComment(f),
        }));

      reviewResp = await githubServiceRequest('/internal/github/reviews/submit', {
        owner,
        repo,
        pr_number: prNumber,
        installation_id: installationId,
        commit_sha: commitSha,
        body: reviewBody,
        event: highOrCritical > 0 ? 'REQUEST_CHANGES' : 'COMMENT',
        comments: reviewComments,
      });
    } catch (reviewErr) {
      logger.error('Failed to submit PR review', { runId, error: reviewErr.message });
    }

    try {
      checkRunResp = await githubServiceRequest('/internal/github/check-runs', {
        owner,
        repo,
        installation_id: installationId,
        head_sha: commitSha,
        conclusion: highOrCritical > 0 ? 'failure' : 'success',
        title: highOrCritical > 0 ? `${highOrCritical} critical/high finding${highOrCritical === 1 ? '' : 's'}` : 'No blocking security findings',
        summary: `CodeSentry found ${actionable.length} finding${actionable.length === 1 ? '' : 's'} (${counts.critical || 0} critical, ${counts.high || 0} high, ${counts.medium || 0} medium, ${counts.low || 0} low).`,
      });
    } catch (checkErr) {
      logger.error('Failed to create check run', { runId, error: checkErr.message });
    }

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
        reviewResp.review_id || null,
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
