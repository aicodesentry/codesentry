const { pool, transaction } = require('../config/database');

async function listByPullRequest(pullRequestId, userId, { status = 'open', minConfidence = 0 }) {
  const result = await pool.query(
    `SELECT f.*
     FROM findings f
     JOIN pull_requests pr ON pr.id = f.pull_request_id
     JOIN repositories r ON r.id = pr.repository_id
     JOIN repository_access ra ON ra.repository_id = r.id
     WHERE pr.id = $1
       AND ra.user_id = $2
       AND ($3::text = 'all' OR f.status = $3)
       AND f.confidence >= $4::numeric
     ORDER BY
       CASE f.severity
         WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4
       END,
       f.confidence DESC,
       f.created_at DESC`,
    [pullRequestId, userId, status, Number(minConfidence)]
  );
  return result.rows;
}

async function listAll(userId, { repositoryId, status = 'open', severity, category }) {
  const params = [userId];
  const clauses = ['ra.user_id = $1'];

  if (repositoryId) {
    params.push(repositoryId);
    clauses.push(`f.repository_id = $${params.length}`);
  }
  if (status !== 'all') {
    params.push(status);
    clauses.push(`f.status = $${params.length}`);
  }
  if (severity) {
    params.push(severity);
    clauses.push(`f.severity = $${params.length}`);
  }
  if (category) {
    params.push(category);
    clauses.push(`f.category = $${params.length}`);
  }

  const result = await pool.query(
     `SELECT f.*
     FROM findings f
     JOIN repositories r ON r.id = f.repository_id
     JOIN repository_access ra ON ra.repository_id = r.id
     WHERE ${clauses.join(' AND ')}
     ORDER BY f.updated_at DESC
     LIMIT 200`,
    params
  );
  return result.rows;
}

async function getById(findingId, userId) {
  const result = await pool.query(
     `SELECT f.*, r.full_name AS repository_full_name, pr.pr_number
     FROM findings f
     JOIN repositories r ON r.id = f.repository_id
     JOIN repository_access ra ON ra.repository_id = r.id
     LEFT JOIN pull_requests pr ON pr.id = f.pull_request_id
     WHERE f.id = $1 AND ra.user_id = $2`,
    [findingId, userId]
  );
  return result.rowCount > 0 ? result.rows[0] : null;
}

async function updateStatus(findingId, userId, { status, dismissalReason }) {
  return transaction(async (client) => {
    const finding = await client.query(
      `SELECT f.id, f.repository_id
       FROM findings f
       JOIN repositories r ON r.id = f.repository_id
       JOIN repository_access ra ON ra.repository_id = r.id
       WHERE f.id = $1 AND ra.user_id = $2`,
      [findingId, userId]
    );

    if (finding.rowCount === 0) return null;

    const statusResult = await client.query(
      `UPDATE findings
       SET status = $1, dismissal_reason = $2, updated_at = NOW(), last_seen_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, dismissalReason || null, findingId]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, repository_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, 'finding.status.updated', 'finding', $3, $4)`,
      [userId, finding.rows[0].repository_id, findingId,
       JSON.stringify({ status, dismissal_reason: dismissalReason || null })]
    );

    return statusResult.rows[0];
  });
}

async function listByAnalysisRun(analysisRunId) {
  const result = await pool.query(
    `SELECT * FROM findings
     WHERE analysis_run_id = $1
     ORDER BY
       CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       confidence DESC`,
    [analysisRunId]
  );
  return result.rows;
}

// --- Internal (used by orchestrator, no user-scoped auth) ---

async function findByFingerprint({ repositoryId, pullRequestId, fingerprint }) {
  const result = await pool.query(
    `SELECT id FROM findings
     WHERE repository_id = $1
       AND pull_request_id = $2
       AND fingerprint = $3`,
    [repositoryId, pullRequestId, fingerprint]
  );
  return result.rowCount > 0 ? result.rows[0] : null;
}

async function upsert(params) {
  const {
    id, runId, pullRequestId, prNumber, commitSha, repositoryId, installationId,
    fingerprint, ruleId, internalType, title, description, category, cweId, owaspCategory,
    taxonomyMappings, taxonomyVersions,
    severity, confidence, exploitability, filePath, lineStart, lineEnd,
    codeSnippet, evidence, exploitScenario, remediation, remediationPatch, isBaseline,
  } = params;

  if (id) {
    const updated = await pool.query(
      `UPDATE findings
       SET analysis_run_id = $1, pull_request_id = $2, pull_request_number = $3,
           commit_sha = $4, internal_type = $5, title = $6, description = $7, category = $8,
           cwe_id = $9, owasp_category = $10, taxonomy_mappings = $11, taxonomy_versions = $12,
           severity = $13, confidence = $14, exploitability = $15, file_path = $16, line_start = $17, line_end = $18,
           code_snippet = $19, evidence = $20, exploit_scenario = $21,
           remediation = $22, remediation_patch = $23, is_baseline = $24,
           last_seen_at = NOW(), updated_at = NOW(),
           status = CASE WHEN status = 'fixed' THEN 'open' ELSE status END
       WHERE id = $25
       RETURNING *`,
      [runId, pullRequestId, prNumber, commitSha, internalType, title, description, category,
       cweId, owaspCategory, JSON.stringify(taxonomyMappings || {}), JSON.stringify(taxonomyVersions || {}),
       severity, confidence, exploitability,
       filePath, lineStart, lineEnd, codeSnippet, evidence, exploitScenario,
       remediation, remediationPatch, isBaseline, id]
    );
    return updated.rows[0];
  }

  const inserted = await pool.query(
    `INSERT INTO findings (
       repository_id, installation_id, pull_request_number, pull_request_id,
       analysis_run_id, commit_sha, fingerprint, rule_id, internal_type, title, description,
       category, cwe_id, owasp_category, taxonomy_mappings, taxonomy_versions, severity, confidence, exploitability,
       file_path, line_start, line_end, code_snippet, evidence, exploit_scenario,
       remediation, remediation_patch, status, is_baseline, first_seen_at, last_seen_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,
       'open',$28,NOW(),NOW()
     ) RETURNING *`,
    [repositoryId, installationId, prNumber, pullRequestId, runId, commitSha,
     fingerprint, ruleId, internalType, title, description, category, cweId, owaspCategory,
     JSON.stringify(taxonomyMappings || {}), JSON.stringify(taxonomyVersions || {}), severity, confidence, exploitability,
     filePath, lineStart, lineEnd, codeSnippet, evidence, exploitScenario, remediation, remediationPatch, isBaseline]
  );
  return inserted.rows[0];
}

async function dismiss(findingId, reason) {
  await pool.query(
    `UPDATE findings SET status = 'dismissed', dismissal_reason = $1, updated_at = NOW() WHERE id = $2`,
    [reason, findingId]
  );
}

async function markFixed({ repositoryId, pullRequestId, activeFingerprints }) {
  if (activeFingerprints.length === 0) {
    await pool.query(
      `UPDATE findings SET status = 'fixed', updated_at = NOW()
       WHERE repository_id = $1 AND pull_request_id = $2 AND status = 'open'`,
      [repositoryId, pullRequestId]
    );
    return;
  }
  await pool.query(
    `UPDATE findings SET status = 'fixed', updated_at = NOW()
     WHERE repository_id = $1 AND pull_request_id = $2 AND status = 'open'
       AND fingerprint <> ALL($3::text[])`,
    [repositoryId, pullRequestId, activeFingerprints]
  );
}

async function getActiveSuppressions(repositoryId) {
  const result = await pool.query(
    `SELECT fingerprint, reason FROM suppressions
     WHERE repository_id = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
    [repositoryId]
  );
  return result.rows;
}

module.exports = {
  listByPullRequest, listAll, getById, updateStatus, listByAnalysisRun,
  findByFingerprint, upsert, dismiss, markFixed, getActiveSuppressions,
};
