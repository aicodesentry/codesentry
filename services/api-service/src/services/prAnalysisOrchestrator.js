const axios = require('axios');
const logger = require('../utils/logger');
const { calculateFingerprint, normalizeFinding } = require('./findingUtils');
const findingsDb = require('../db/findings');
const analysisRunsDb = require('../db/analysisRuns');

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
      '<!-- mitig8it-review -->',
      '### 🛡️ Mitig8it — No security issues found',
      '',
      'This PR passed all security checks.',
      '',
      `<sub>Run \`${runId.slice(0, 8)}\`</sub>`,
    ].join('\n');
  }

  return [
    '<!-- mitig8it-review -->',
    `### 🛡️ Mitig8it — ${total} finding${total === 1 ? '' : 's'} detected`,
    '',
    hasBlocking ? '**Resolve critical and high severity issues before merging.**' : 'No blocking issues. Review at your discretion.',
    '',
    `| ${severityIcon('critical')} Critical | ${severityIcon('high')} High | ${severityIcon('medium')} Medium | ${severityIcon('low')} Low |`,
    '|---|---|---|---|',
    `| **${counts.critical || 0}** | **${counts.high || 0}** | **${counts.medium || 0}** | **${counts.low || 0}** |`,
    '',
    `<sub>Analyzed by <strong>Mitig8it</strong> · Run \`${runId.slice(0, 8)}\` · Findings are annotated on the affected lines below</sub>`,
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

async function submitReviewWithFallback({
  owner,
  repo,
  prNumber,
  installationId,
  commitSha,
  reviewBody,
  event,
  reviewComments,
}) {
  try {
    return await githubServiceRequest('/internal/github/reviews/submit', {
      owner,
      repo,
      pr_number: prNumber,
      installation_id: installationId,
      commit_sha: commitSha,
      body: reviewBody,
      event,
      comments: reviewComments,
    });
  } catch (error) {
    if (!reviewComments.length) throw error;

    logger.error('Failed to submit PR review with inline comments, retrying summary-only review', {
      prNumber,
      error: error.message,
      attemptedComments: reviewComments.length,
    });

    return githubServiceRequest('/internal/github/reviews/submit', {
      owner,
      repo,
      pr_number: prNumber,
      installation_id: installationId,
      commit_sha: commitSha,
      body: `${reviewBody}\n\n<sub>Inline annotations were skipped because GitHub rejected one or more review comments for this diff.</sub>`,
      event,
      comments: [],
    });
  }
}

function analysisServiceHeaders() {
  const internalSecret =
    process.env.ANALYSIS_SERVICE_INTERNAL_SECRET || process.env.GITHUB_SERVICE_INTERNAL_SECRET;

  if (!internalSecret) {
    throw new Error('Missing ANALYSIS_SERVICE_INTERNAL_SECRET or GITHUB_SERVICE_INTERNAL_SECRET');
  }

  return {
    'x-internal-secret': internalSecret,
  };
}

async function upsertFinding({ finding, runId, pullRequestId, repositoryId, installationId, prNumber, commitSha, isBaseline }) {
  const normalized = normalizeFinding(finding);
  const fingerprint = normalized.fingerprint || calculateFingerprint(normalized);

  const existing = await findingsDb.findByFingerprint({
    repositoryId,
    pullRequestId,
    fingerprint,
  });

  return findingsDb.upsert({
    id: existing?.id || null,
    runId,
    pullRequestId,
    prNumber,
    commitSha,
    repositoryId,
    installationId,
    fingerprint,
    ruleId: normalized.rule_id,
    internalType: normalized.internal_type,
    title: normalized.title,
    description: normalized.description,
    category: normalized.category,
    cweId: normalized.cwe_id || null,
    owaspCategory: normalized.owasp_category || null,
    taxonomyMappings: normalized.taxonomy_mappings,
    taxonomyVersions: normalized.taxonomy_versions,
    severity: normalized.severity,
    confidence: Number(normalized.confidence || 0.4),
    exploitability: normalized.exploitability || 'medium',
    filePath: normalized.file_path,
    lineStart: normalized.line_start || null,
    lineEnd: normalized.line_end || null,
    codeSnippet: normalized.code_snippet || null,
    evidence: normalized.evidence || null,
    exploitScenario: normalized.exploit_scenario || null,
    remediation: normalized.remediation || null,
    remediationPatch: normalized.remediation_patch || null,
    isBaseline,
  });
}

async function applySuppressions(findingRows, repositoryId) {
  const suppressions = await findingsDb.getActiveSuppressions(repositoryId);
  const byFingerprint = new Map(suppressions.map((row) => [row.fingerprint, row]));

  const result = [];
  for (const finding of findingRows) {
    const suppression = byFingerprint.get(finding.fingerprint);
    if (suppression) {
      await findingsDb.dismiss(finding.id, suppression.reason);
      result.push({ ...finding, status: 'dismissed', dismissal_reason: suppression.reason });
    } else {
      result.push(finding);
    }
  }
  return result;
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
      { repository_full_name: repositoryFullName, pull_request_number: prNumber, commit_sha: commitSha, files },
      {
        timeout: 90000,
        headers: analysisServiceHeaders(),
      }
    );

    const findings = analysisResp.data.findings || [];
    const completedCount = await analysisRunsDb.countCompletedRuns(repositoryId, runId);
    const shouldMarkBaselineSet = !baselineSet && completedCount === 0;

    const persisted = [];
    for (const finding of findings) {
      const saved = await upsertFinding({
        finding, runId, pullRequestId, repositoryId, installationId, prNumber, commitSha,
        isBaseline: false,
      });
      persisted.push(saved);
    }

    const activeFingerprints = persisted.map((f) => f.fingerprint);
    await findingsDb.markFixed({ repositoryId, pullRequestId, activeFingerprints });

    const postSuppression = await applySuppressions(persisted, repositoryId);
    const actionable = postSuppression.filter((f) => f.status === 'open' && !f.is_baseline);

    const counts = summarizeFindings(actionable).counts;
    const highOrCritical = (counts.critical || 0) + (counts.high || 0);
    let reviewResp = {};
    let checkRunResp = {};

    try {
      const reviewBody = buildReviewBody(actionable, runId);
      const fileMaxLines = new Map(files.map((f) => [f.path, f.additions || 1]));
      const reviewComments = actionable
        .filter((f) => Number(f.confidence) >= 0.7 && fileMaxLines.has(f.file_path))
        .filter((f) => (f.line_start || 1) <= (fileMaxLines.get(f.file_path) || 1))
        .map((f) => ({ path: f.file_path, line: f.line_start || 1, body: buildReviewComment(f) }));

      reviewResp = await submitReviewWithFallback({
        owner,
        repo,
        prNumber,
        installationId,
        commitSha,
        reviewBody,
        event: highOrCritical > 0 ? 'REQUEST_CHANGES' : 'COMMENT',
        reviewComments,
      });
    } catch (reviewErr) {
      logger.error('Failed to submit PR review', { runId, error: reviewErr.message });
    }

    try {
      checkRunResp = await githubServiceRequest('/internal/github/check-runs', {
        owner, repo, installation_id: installationId, head_sha: commitSha,
        conclusion: highOrCritical > 0 ? 'failure' : 'success',
        title: highOrCritical > 0 ? `${highOrCritical} critical/high finding${highOrCritical === 1 ? '' : 's'}` : 'No blocking security findings',
        summary: `Mitig8it found ${actionable.length} finding${actionable.length === 1 ? '' : 's'} (${counts.critical || 0} critical, ${counts.high || 0} high, ${counts.medium || 0} medium, ${counts.low || 0} low).`,
      });
    } catch (checkErr) {
      logger.error('Failed to create check run', { runId, error: checkErr.message });
    }

    await analysisRunsDb.markCompleted(runId, {
      findingsCount: actionable.length,
      counts,
      filesAnalyzed: files.length,
      checkRunId: checkRunResp.check_run_id,
      reviewId: reviewResp.review_id,
    });

    if (shouldMarkBaselineSet) {
      await analysisRunsDb.markBaselineSet(repositoryId);
    }
  } catch (error) {
    logger.error('PR analysis orchestration failed', { runId, repositoryId, error: error.message });
    await analysisRunsDb.markFailed(runId, error.message);
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

module.exports = { triggerAnalysisJob };
