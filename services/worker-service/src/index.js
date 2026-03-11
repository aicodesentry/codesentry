require('dotenv').config();

const crypto = require('crypto');
const axios = require('axios');
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { Pool } = require('pg');
const { calculateFingerprint, normalizeFinding } = require('./findingUtils');

const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => Math.min(times * 250, 5000),
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL?.includes('postgres:5432')
      ? { rejectUnauthorized: true }
      : false,
});

function log(level, message, meta = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, message, ...meta }));
}

function normalizePrivateKey(rawKey) {
  if (!rawKey) return null;
  let key = rawKey;
  if (!key.includes('BEGIN')) {
    try {
      key = Buffer.from(rawKey, 'base64').toString('utf8');
    } catch (_) {
      key = rawKey;
    }
  }
  return key.replace(/\\n/g, '\n');
}

function createAppJwt() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = normalizePrivateKey(process.env.GITHUB_APP_PRIVATE_KEY);
  if (!appId || !privateKey) {
    throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY are required in worker');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iat: now - 60, exp: now + 9 * 60, iss: appId };

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const content = `${b64(header)}.${b64(payload)}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(content);
  const sig = signer.sign(privateKey, 'base64url');
  return `${content}.${sig}`;
}

async function getInstallationToken(installationId) {
  const jwt = createAppJwt();
  const resp = await axios.post(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {},
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
      },
      timeout: 20000,
    }
  );
  return resp.data.token;
}

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
  const total = findings.length;

  const topFindings = findings
    .filter((f) => Number(f.confidence) >= 0.55)
    .sort((a, b) => Number(b.confidence) - Number(a.confidence))
    .slice(0, 8);

  const categoryLine = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => `${name}: ${count}`)
    .join(' | ');

  const body = [
    `<!-- codesentry-summary:${prNumber} -->`,
    `## CodeSentry Security Review`,
    '',
    `Run: \`${runId}\``,
    `Total findings: **${total}**`,
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
  ].filter(Boolean);

  return body.join('\n');
}

async function githubRequest(method, url, token, data) {
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await axios({
        method,
        url,
        data,
        timeout: 25000,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
    } catch (error) {
      const status = error.response?.status;
      const retryable = [429, 500, 502, 503, 504].includes(status);
      if (!retryable || attempt === maxAttempts) {
        throw error;
      }
      const delayMs = 1000 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function fetchChangedFiles({ repositoryFullName, pullRequestNumber, token }) {
  const files = [];
  let page = 1;

  while (true) {
    const response = await githubRequest(
      'get',
      `https://api.github.com/repos/${repositoryFullName}/pulls/${pullRequestNumber}/files?per_page=100&page=${page}`,
      token
    );

    files.push(...response.data);
    if (response.data.length < 100) break;
    page += 1;
  }

  return files
    .filter((f) => ['added', 'modified', 'renamed'].includes(f.status))
    .filter((f) => !f.filename.startsWith('dist/') && !f.filename.includes('node_modules'))
    .slice(0, 200)
    .map((f) => ({
      path: f.filename,
      patch: f.patch || '',
      additions: f.additions,
      deletions: f.deletions,
      status: f.status,
      raw_url: f.raw_url,
    }));
}

async function upsertFinding({ finding, runId, pullRequestId, repositoryId, installationId, prNumber, commitSha, isBaseline }) {
  const normalized = normalizeFinding(finding);
  const fingerprint = calculateFingerprint(normalized);

  const existing = await pool.query('SELECT id, inline_comment_id FROM findings WHERE fingerprint = $1', [fingerprint]);

  if (existing.rowCount > 0) {
    const update = await pool.query(
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

    return { finding: update.rows[0], isNew: false };
  }

  const insert = await pool.query(
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

  return { finding: insert.rows[0], isNew: true };
}

async function applySuppressions(findingRows, repositoryId) {
  const suppressions = await pool.query(
    `SELECT fingerprint, reason, notes
     FROM suppressions
     WHERE repository_id = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
    [repositoryId]
  );

  const byFingerprint = new Map(suppressions.rows.map((s) => [s.fingerprint, s]));

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

async function postOrUpdateSummaryComment({ owner, repo, prNumber, token, body }) {
  const existingResp = await githubRequest(
    'get',
    `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`,
    token
  );

  const marker = `<!-- codesentry-summary:${prNumber} -->`;
  const existing = existingResp.data.find((comment) => comment.body?.includes(marker));

  if (existing) {
    const resp = await githubRequest(
      'patch',
      `https://api.github.com/repos/${owner}/${repo}/issues/comments/${existing.id}`,
      token,
      { body }
    );
    return resp.data.id;
  }

  const created = await githubRequest(
    'post',
    `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    token,
    { body }
  );
  return created.data.id;
}

async function postInlineComments({ owner, repo, prNumber, token, findings, commitSha }) {
  for (const finding of findings) {
    if (Number(finding.confidence) < 0.8) continue;
    if (finding.inline_comment_id) continue;

    const body = [
      `**${finding.title}**`,
      '',
      `Severity: **${finding.severity}** | Confidence: **${Math.round(Number(finding.confidence) * 100)}%**`,
      '',
      finding.evidence || finding.description,
      '',
      `Exploitability: ${finding.exploitability || 'medium'}`,
      '',
      `Remediation: ${finding.remediation || 'Apply input validation and secure handling.'}`,
    ].join('\n');

    try {
      const resp = await githubRequest(
        'post',
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/comments`,
        token,
        {
          body,
          commit_id: commitSha,
          path: finding.file_path,
          line: finding.line_start || 1,
          side: 'RIGHT',
        }
      );

      await pool.query('UPDATE findings SET inline_comment_id = $1 WHERE id = $2', [resp.data.id, finding.id]);
    } catch (error) {
      log('warn', 'Failed inline comment', {
        finding_id: finding.id,
        status: error.response?.status,
        detail: error.response?.data,
      });
    }
  }
}

async function upsertCheckRun({ owner, repo, token, headSha, conclusion, summary, title }) {
  const resp = await githubRequest('post', `https://api.github.com/repos/${owner}/${repo}/check-runs`, token, {
    name: 'CodeSentry Security Review',
    head_sha: headSha,
    status: 'completed',
    conclusion,
    output: {
      title,
      summary,
    },
  });

  return resp.data.id;
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

async function processJob(job) {
  const payload = job.data;
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

  log('info', 'Processing analysis job', {
    runId,
    repositoryId,
    prNumber,
    repositoryFullName,
  });

  const token = await getInstallationToken(installationId);
  const files = await fetchChangedFiles({ repositoryFullName, pullRequestNumber: prNumber, token });

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
    const { finding: saved } = await upsertFinding({
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
  const summaryCommentId = await postOrUpdateSummaryComment({
    owner,
    repo,
    prNumber,
    token,
    body: summaryBody,
  });

  await postInlineComments({
    owner,
    repo,
    prNumber,
    token,
    findings: actionable,
    commitSha,
  });

  const counts = summarizeFindings(actionable).counts;
  const highOrCritical = (counts.critical || 0) + (counts.high || 0);

  const checkRunId = await upsertCheckRun({
    owner,
    repo,
    token,
    headSha: commitSha,
    conclusion: highOrCritical > 0 ? 'failure' : 'success',
    title: highOrCritical > 0 ? 'Security findings require attention' : 'No blocking security findings',
    summary: `CodeSentry found ${actionable.length} actionable findings (${counts.critical || 0} critical, ${counts.high || 0} high, ${counts.medium || 0} medium).`,
  });

  if (isInitialBaselineRun) {
    await pool.query('UPDATE repositories SET baseline_set = true, updated_at = NOW() WHERE id = $1', [repositoryId]);
  }

  await axios.post(
    `${process.env.API_CALLBACK_URL || 'http://api-service:3000'}/internal/analysis-runs/${runId}/complete`,
    {
      status: 'completed',
      files_analyzed: files.length,
      findings_count: actionable.length,
      critical_count: counts.critical || 0,
      high_count: counts.high || 0,
      medium_count: counts.medium || 0,
      low_count: counts.low || 0,
      github_check_run_id: checkRunId,
      summary_comment_id: summaryCommentId,
    },
    {
      timeout: 20000,
      headers: {
        'x-worker-secret': process.env.WORKER_CALLBACK_SECRET,
      },
    }
  );

  return { runId, findings: actionable.length };
}

async function failRun(runId, message) {
  try {
    await axios.post(
      `${process.env.API_CALLBACK_URL || 'http://api-service:3000'}/internal/analysis-runs/${runId}/complete`,
      {
        status: 'failed',
        error_message: message,
      },
      {
        timeout: 20000,
        headers: {
          'x-worker-secret': process.env.WORKER_CALLBACK_SECRET,
        },
      }
    );
  } catch (error) {
    log('error', 'Failed to callback failed run', { runId, error: error.message });
  }
}

async function start() {
  const required = ['DATABASE_URL', 'REDIS_URL', 'WORKER_CALLBACK_SECRET', 'GITHUB_APP_ID', 'GITHUB_APP_PRIVATE_KEY'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  await pool.query('SELECT 1');
  await redis.ping();

  const worker = new Worker(
    'pr-analysis',
    async (job) => {
      try {
        return await processJob(job);
      } catch (error) {
        await failRun(job.data.analysis_run_id, error.message);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: Number(process.env.WORKER_CONCURRENCY || 2),
      lockDuration: 120000,
    }
  );

  worker.on('completed', (job, result) => {
    log('info', 'Job completed', { jobId: job.id, result });
  });

  worker.on('failed', (job, error) => {
    log('error', 'Job failed', {
      jobId: job?.id,
      runId: job?.data?.analysis_run_id,
      error: error.message,
    });
  });

  log('info', 'CodeSentry worker started');
}

start().catch((error) => {
  log('error', 'Worker boot failure', { error: error.message });
  process.exit(1);
});
