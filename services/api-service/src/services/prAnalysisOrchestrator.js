const axios = require('axios');
const logger = require('../utils/logger');
const { calculateFingerprint, normalizeFinding } = require('./findingUtils');
const { validateSuggestedFix, __private: validatorPrivate } = require('./suggestedFixValidator');
const findingsDb = require('../db/findings');
const analysisRunsDb = require('../db/analysisRuns');
const repositoriesDb = require('../db/repositories');

const TIER2_SUPPORTED_EXTENSIONS = new Set([
  '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.rb', '.php',
  '.cs', '.c', '.cpp', '.h', '.hpp', '.rs', '.swift', '.kt',
]);

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

const normalizeSuggestionPatch = validatorPrivate.normalizePatch;
const looksLikeUnifiedDiff = validatorPrivate.looksLikeUnifiedDiff;
const buildRepoAwareRemediation = validatorPrivate.buildRepoAwareRemediation;

function shouldRenderSuggestion(finding, suggestionPatch) {
  if (!suggestionPatch) return false;
  if (suggestionPatch.includes('```')) return false;

  const lineStart = Number(finding.line_start || 0);
  if (!lineStart) return false;
  const lineEnd = Number(finding.line_end || lineStart);
  const anchorSpan = Math.max(1, lineEnd - lineStart + 1);

  const patchLines = suggestionPatch.split('\n').length;
  if (patchLines > 8) return false;

  if (patchLines < anchorSpan) return false;
  if (patchLines > anchorSpan + 3) return false;

  return true;
}

function inferCodeFenceLanguage(filePath) {
  const path = String(filePath || '').toLowerCase();
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'ts';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.go')) return 'go';
  if (path.endsWith('.java')) return 'java';
  if (path.endsWith('.rb')) return 'ruby';
  if (path.endsWith('.cs')) return 'csharp';
  if (path.endsWith('.php')) return 'php';
  return '';
}

function shouldRenderFixCodeBlock(suggestionPatch) {
  if (!suggestionPatch) return false;
  if (suggestionPatch.includes('```')) return false;
  if (looksLikeUnifiedDiff(suggestionPatch)) return false;
  if (suggestionPatch.split('\n').length > 20) return false;
  return true;
}

function findingUpdateSignature(finding) {
  return JSON.stringify({
    fingerprint: finding?.fingerprint || '',
    severity: finding?.severity || '',
    confidence: Number(finding?.confidence || 0),
    title: finding?.title || '',
    evidence: finding?.evidence || '',
    remediation: finding?.remediation || '',
    remediation_patch: finding?.remediation_patch || '',
    line_start: Number(finding?.line_start || 0),
    line_end: Number(finding?.line_end || 0),
  });
}

function didTier3MeaningfullyChangeFindings(previousFindings, nextFindings) {
  const previous = Array.isArray(previousFindings) ? previousFindings : [];
  const next = Array.isArray(nextFindings) ? nextFindings : [];

  if (previous.length !== next.length) return true;

  const previousByFingerprint = new Map(
    previous.map((finding) => [finding?.fingerprint || '', findingUpdateSignature(finding)])
  );

  for (const finding of next) {
    const fingerprint = finding?.fingerprint || '';
    if (!previousByFingerprint.has(fingerprint)) return true;
    if (previousByFingerprint.get(fingerprint) !== findingUpdateSignature(finding)) return true;
  }

  return false;
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
    'Detailed findings are annotated inline on the affected lines below.',
    '',
    `<sub>Analyzed by <strong>Mitig8it</strong> · Run \`${runId.slice(0, 8)}\` · Findings are annotated on the affected lines below</sub>`,
  ].join('\n');
}

function buildReviewComment(finding, options = {}) {
  const suggestionPatch = normalizeSuggestionPatch(finding.remediation_patch);
  const suggestionValidation = validateSuggestedFix({
    finding,
    filePatch: options.filePatch || '',
    tierLabel: options.tierLabel || 'manual',
    repoProfile: options.repoProfile || null,
  });
  const repoAwareRemediation =
    buildRepoAwareRemediation(finding, options.repoProfile || null)
    || finding.remediation
    || 'Apply input validation and secure handling.';
  const lines = [
    `${severityIcon(finding.severity)} **${finding.severity.toUpperCase()}** — ${markdownEscape(finding.title)}`,
    '',
    `> ${markdownEscape(finding.evidence || finding.description)}`,
    '',
    finding.cwe_id ? `**CWE:** ${finding.cwe_id}` : null,
    `**Confidence:** ${Math.round(Number(finding.confidence) * 100)}%`,
  ];

  const showSuggestion = shouldRenderSuggestion(finding, suggestionPatch) && suggestionValidation.ok;
  const showFixCodeBlock = !showSuggestion && shouldRenderFixCodeBlock(suggestionPatch);
  const codeFenceLanguage = inferCodeFenceLanguage(finding.file_path);

  if (showSuggestion) {
    lines.push('', '```suggestion', suggestionPatch, '```');
  } else {
    lines.push('', `**Fix:** ${markdownEscape(repoAwareRemediation)}`);
    if (showFixCodeBlock) {
      lines.push('', `\`\`\`${codeFenceLanguage}`, suggestionPatch, '```');
    }
  }

  return lines.filter(Boolean).join('\n');
}

const extractReviewableLines = validatorPrivate.extractReviewableLines;
const extractReviewableLineSpans = validatorPrivate.extractReviewableLineSpans;

function fileExtension(path) {
  const match = String(path || '').toLowerCase().match(/(\.[^.\/]+)$/);
  return match ? match[1] : '';
}

function shouldFetchFullFileContent(file) {
  const path = String(file?.path || '');
  const ext = fileExtension(path);
  if (!TIER2_SUPPORTED_EXTENSIONS.has(ext)) return false;
  if (path.startsWith('dist/') || path.includes('node_modules/')) return false;
  if (path.endsWith('.min.js') || path.endsWith('.min.css')) return false;
  return true;
}

function buildTier2FilePayload(file, contentByPath = new Map()) {
  const content = contentByPath.get(file.path);
  return {
    ...file,
    content: typeof content === 'string' ? content : '',
    reviewable_line_spans: extractReviewableLineSpans(file.patch),
  };
}

async function enrichFilesForTier2({ files, repositoryFullName, installationId, commitSha }) {
  const sourceFiles = Array.isArray(files) ? files : [];
  const candidates = sourceFiles.filter(shouldFetchFullFileContent);
  const contentByPath = new Map();

  if (candidates.length > 0) {
    try {
      const response = await githubServiceRequest('/internal/github/files/content', {
        repository_full_name: repositoryFullName,
        installation_id: installationId,
        ref: commitSha,
        paths: candidates.map((file) => file.path),
      });

      for (const file of response.files || []) {
        if (!file?.path || typeof file.content !== 'string') continue;
        contentByPath.set(file.path, file.content);
      }
    } catch (error) {
      logger.warn('Failed to enrich Tier 2 files with full content', {
        repositoryFullName,
        commitSha,
        error: error.message,
      });
    }
  }

  return sourceFiles.map((file) => buildTier2FilePayload(file, contentByPath));
}

function severityRank(severity) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[String(severity || '').toLowerCase()] || 0;
}

function compareReviewComments(a, b) {
  const pathCompare = String(a.path || '').localeCompare(String(b.path || ''));
  if (pathCompare !== 0) return pathCompare;

  if (Boolean(a.hasSuggestion) !== Boolean(b.hasSuggestion)) {
    return a.hasSuggestion ? -1 : 1;
  }

  const lineDiff = Number(a.line || 0) - Number(b.line || 0);
  if (lineDiff !== 0) return lineDiff;

  const severityDiff = severityRank(b.severity) - severityRank(a.severity);
  if (severityDiff !== 0) return severityDiff;

  return String(a.body || '').localeCompare(String(b.body || ''));
}

function prioritizeReviewComments(reviewComments) {
  return [...(reviewComments || [])].sort(compareReviewComments);
}

function hasTier3RenderableSuggestions(findings, files, repoProfile) {
  const filePatchByPath = new Map((files || []).map((f) => [f.path, f.patch || '']));
  return (findings || []).some((finding) => {
    const suggestionPatch = normalizeSuggestionPatch(finding.remediation_patch);
    if (!shouldRenderSuggestion(finding, suggestionPatch)) return false;

    const validation = validateSuggestedFix({
      finding,
      filePatch: filePatchByPath.get(finding.file_path) || '',
      tierLabel: 'Tier 3',
      repoProfile,
    });
    return validation.ok;
  });
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
}) {
  return githubServiceRequest('/internal/github/reviews/submit', {
    owner,
    repo,
    pr_number: prNumber,
    installation_id: installationId,
    commit_sha: commitSha,
    body: reviewBody,
    event,
    comments: [],
  });
}

function dedupeInlineComments(reviewComments) {
  const seen = new Set();
  const deduped = [];
  for (const comment of reviewComments) {
    const key = `${comment.path}:${comment.line}:${comment.body}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(comment);
  }
  return deduped;
}

async function postInlineCommentsIndividually({
  owner,
  repo,
  prNumber,
  installationId,
  commitSha,
  reviewComments,
  runId,
}) {
  const dedupedComments = dedupeInlineComments(prioritizeReviewComments(reviewComments)).slice(0, 40);
  let posted = 0;

  for (const comment of dedupedComments) {
    try {
      await githubServiceRequest('/internal/github/comments/inline', {
        owner,
        repo,
        pr_number: prNumber,
        installation_id: installationId,
        commit_sha: commitSha,
        path: comment.path,
        line: comment.line,
        body: comment.body,
      });
      posted += 1;
    } catch (error) {
      logger.error('Failed to post inline PR comment', {
        runId,
        prNumber,
        path: comment.path,
        line: comment.line,
        error: error.message,
      });
    }
  }

  return { attempted: dedupedComments.length, posted };
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
    analysisScope: normalized.analysis_scope || 'pattern',
    evidenceDetails: normalized.evidence_details || {},
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

async function callAnalysisTier(tierPath, payload, timeout) {
  const baseUrl = process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:8001';
  const response = await axios.post(`${baseUrl}${tierPath}`, payload, {
    timeout,
    headers: analysisServiceHeaders(),
  });
  return response.data;
}

async function persistAndFilter({ findings, runId, pullRequestId, repositoryId, installationId, prNumber, commitSha, baselineSet }) {
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

  return { actionable, shouldMarkBaselineSet };
}

async function postReviewToGitHub({ actionable, files, owner, repo, prNumber, installationId, commitSha, runId, tierLabel, repoProfile }) {
  const counts = summarizeFindings(actionable).counts;
  const highOrCritical = (counts.critical || 0) + (counts.high || 0);

  let reviewResp = {};
  try {
    const reviewBody = buildReviewBody(actionable, runId);
    const reviewableLinesByFile = new Map(files.map((f) => [f.path, extractReviewableLines(f.patch)]));
    const filePatchByPath = new Map(files.map((f) => [f.path, f.patch || '']));
    const suggestionStats = { rendered: 0, noPatch: 0, gateRejected: 0, validatorRejected: 0 };
    const rejectionReasons = {};
    const reviewComments = actionable
      .filter((f) => Number(f.confidence) >= 0.7 && reviewableLinesByFile.has(f.file_path))
      .filter((f) => reviewableLinesByFile.get(f.file_path)?.has(f.line_start || 1))
      .map((f) => {
        const filePatch = filePatchByPath.get(f.file_path) || '';
        const suggestionPatch = normalizeSuggestionPatch(f.remediation_patch);
        const suggestionValidation = validateSuggestedFix({
          finding: f,
          filePatch,
          tierLabel,
          repoProfile,
        });
        const gatePassed = shouldRenderSuggestion(f, suggestionPatch);
        const hasSuggestion = gatePassed && suggestionValidation.ok;

        if (hasSuggestion) {
          suggestionStats.rendered += 1;
        } else if (!suggestionPatch) {
          suggestionStats.noPatch += 1;
        } else if (!gatePassed) {
          suggestionStats.gateRejected += 1;
        } else {
          suggestionStats.validatorRejected += 1;
          const reason = suggestionValidation.reason || 'unknown';
          rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
        }

        return {
          path: f.file_path,
          line: f.line_start || 1,
          severity: f.severity,
          hasSuggestion,
          body: buildReviewComment(f, {
            filePatch,
            tierLabel,
            repoProfile,
          }),
        };
      });

    if (reviewComments.length > 0) {
      logger.info(`${tierLabel}: suggestion render outcomes`, {
        runId,
        prNumber,
        total: reviewComments.length,
        ...suggestionStats,
        validatorReasons: rejectionReasons,
      });
    }

    reviewResp = await submitReviewWithFallback({
      owner, repo, prNumber, installationId, commitSha,
      reviewBody,
      event: highOrCritical > 0 ? 'REQUEST_CHANGES' : 'COMMENT',
    });

    const inlineResult = await postInlineCommentsIndividually({
      owner, repo, prNumber, installationId, commitSha, reviewComments, runId,
    });

    if (inlineResult.attempted > inlineResult.posted) {
      logger.warn(`${tierLabel}: some inline comments skipped`, {
        runId, prNumber, attempted: inlineResult.attempted, posted: inlineResult.posted,
      });
    }
  } catch (reviewErr) {
    logger.error(`${tierLabel}: failed to submit PR review`, { runId, error: reviewErr.message });
  }

  return { reviewResp, counts, highOrCritical };
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
  const analysisPayload = { repository_full_name: repositoryFullName, pull_request_number: prNumber, commit_sha: commitSha };

  let allFindings = [];
  let files = [];
  let tier2Files = [];
  let lastCounts = {};
  let lastHighOrCritical = 0;
  let reviewResp = {};
  let checkRunResp = {};
  let shouldMarkBaselineSet = false;

  try {
    // ── Fetch PR files ────────────────────────────────────────────────
    const filesResp = await githubServiceRequest('/internal/github/pulls/files', {
      repository_full_name: repositoryFullName,
      pull_request_number: prNumber,
      installation_id: installationId,
    });
    files = filesResp.files || [];
    tier2Files = await enrichFilesForTier2({
      files,
      repositoryFullName,
      installationId,
      commitSha,
    });

    // ── Tier 1: Regex (<100ms) — post initial review immediately ─────
    try {
      const tier1 = await callAnalysisTier('/analyze/pr/tier1', { ...analysisPayload, files }, 30000);
      allFindings = tier1.findings || [];

      if (allFindings.length > 0) {
        const { actionable, shouldMarkBaselineSet: sbs } = await persistAndFilter({
          findings: allFindings, runId, pullRequestId, repositoryId, installationId, prNumber, commitSha, baselineSet,
        });
        shouldMarkBaselineSet = sbs;

        const result = await postReviewToGitHub({
          actionable, files, owner, repo, prNumber, installationId, commitSha, runId, tierLabel: 'Tier 1', repoProfile: null,
        });
        reviewResp = result.reviewResp;
        lastCounts = result.counts;
        lastHighOrCritical = result.highOrCritical;
      }
    } catch (tier1Err) {
      logger.error('Tier 1 analysis failed', { runId, error: tier1Err.message });
    }

    // ── Tier 2: OpenGrep (2-5s) — update review with AST findings ────
    try {
      const tier2 = await callAnalysisTier('/analyze/pr/tier2', { ...analysisPayload, files: tier2Files }, 60000);
      const tier2Findings = tier2.findings || [];

      if (tier2Findings.length > 0) {
        allFindings = allFindings.concat(tier2Findings);

        const { actionable, shouldMarkBaselineSet: sbs } = await persistAndFilter({
          findings: allFindings, runId, pullRequestId, repositoryId, installationId, prNumber, commitSha, baselineSet,
        });
        shouldMarkBaselineSet = shouldMarkBaselineSet || sbs;

        const result = await postReviewToGitHub({
          actionable, files, owner, repo, prNumber, installationId, commitSha, runId, tierLabel: 'Tier 2', repoProfile: null,
        });
        reviewResp = result.reviewResp;
        lastCounts = result.counts;
        lastHighOrCritical = result.highOrCritical;
      }
    } catch (tier2Err) {
      logger.error('Tier 2 analysis failed (non-blocking)', { runId, error: tier2Err.message });
    }

    // ── Tier 3: LLM triage (10-30s) — update review with refined findings
    try {
      const filePatchMap = {};
      for (const f of files) { filePatchMap[f.path] = f.patch || ''; }

      // Fetch repo profile if available
      let repoProfile = {};
      try {
        const profileRow = await repositoriesDb.getProfile(repositoryId);
        if (profileRow && profileRow.profile_status === 'ready') {
          repoProfile = profileRow.profile_data || {};
        } else {
          // No profile — queue urgent profiling for next time
          await repositoriesDb.queueUrgentProfiling(repositoryId, { run_id: runId, pr_number: prNumber });
        }
      } catch (profileErr) {
        logger.warn('Failed to fetch repo profile', { runId, error: profileErr.message });
      }

      const tier3 = await callAnalysisTier('/analyze/pr/tier3', {
        ...analysisPayload,
        findings: allFindings,
        file_patches: filePatchMap,
        repo_profile: repoProfile,
      }, 120000);

      const triaged = tier3.findings || [];
      const filteredCount = tier3.filtered_count || 0;

      if (
        filteredCount > 0
        || didTier3MeaningfullyChangeFindings(allFindings, triaged)
        || hasTier3RenderableSuggestions(triaged, files, repoProfile)
      ) {
        allFindings = triaged;

        const { actionable, shouldMarkBaselineSet: sbs } = await persistAndFilter({
          findings: allFindings, runId, pullRequestId, repositoryId, installationId, prNumber, commitSha, baselineSet,
        });
        shouldMarkBaselineSet = shouldMarkBaselineSet || sbs;

        const result = await postReviewToGitHub({
          actionable, files, owner, repo, prNumber, installationId, commitSha, runId, tierLabel: 'Tier 3', repoProfile,
        });
        reviewResp = result.reviewResp;
        lastCounts = result.counts;
        lastHighOrCritical = result.highOrCritical;
      }
    } catch (tier3Err) {
      logger.error('Tier 3 LLM triage failed (non-blocking)', { runId, error: tier3Err.message });
    }

    // ── Check run + completion ────────────────────────────────────────
    try {
      const finalCounts = Object.keys(lastCounts).length > 0 ? lastCounts : { critical: 0, high: 0, medium: 0, low: 0 };
      const finalTotal = allFindings.length;
      checkRunResp = await githubServiceRequest('/internal/github/check-runs', {
        owner, repo, installation_id: installationId, head_sha: commitSha,
        conclusion: lastHighOrCritical > 0 ? 'failure' : 'success',
        title: lastHighOrCritical > 0 ? `${lastHighOrCritical} critical/high finding${lastHighOrCritical === 1 ? '' : 's'}` : 'No blocking security findings',
        summary: `Mitig8it found ${finalTotal} finding${finalTotal === 1 ? '' : 's'} (${finalCounts.critical || 0} critical, ${finalCounts.high || 0} high, ${finalCounts.medium || 0} medium, ${finalCounts.low || 0} low).`,
      });
    } catch (checkErr) {
      logger.error('Failed to create check run', { runId, error: checkErr.message });
    }

    await analysisRunsDb.markCompleted(runId, {
      findingsCount: allFindings.length,
      counts: lastCounts,
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

module.exports = {
  triggerAnalysisJob,
  __private: {
    buildReviewBody,
    buildReviewComment,
    buildTier2FilePayload,
    compareReviewComments,
    didTier3MeaningfullyChangeFindings,
    enrichFilesForTier2,
    fileExtension,
    hasTier3RenderableSuggestions,
    normalizeSuggestionPatch,
    prioritizeReviewComments,
    shouldFetchFullFileContent,
    shouldRenderSuggestion,
    validateSuggestedFix,
  },
};
