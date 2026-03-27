const { pool, transaction } = require('../config/database');

async function listByPullRequest(pullRequestId, userId, { status = 'open', minConfidence = 0 }) {
  const result = await pool.query(
    `SELECT f.*
     FROM findings f
     JOIN pull_requests pr ON pr.id = f.pull_request_id
     JOIN repositories r ON r.id = pr.repository_id
     WHERE pr.id = $1
       AND r.installation_id IN (SELECT installation_id FROM user_installations WHERE user_id = $2)
       AND ($3::text = 'all' OR f.status = $3)
       AND f.confidence >= $4::numeric
     ORDER BY
       CASE f.severity
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         ELSE 4
       END,
       f.confidence DESC,
       f.created_at DESC`,
    [pullRequestId, userId, status, Number(minConfidence)]
  );
  return result.rows;
}

async function listAll(userId, { repositoryId, status = 'open', severity, category }) {
  const params = [userId];
  const clauses = ['r.installation_id IN (SELECT installation_id FROM user_installations WHERE user_id = $1)'];

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

  const query = `
    SELECT f.*
    FROM findings f
    JOIN repositories r ON r.id = f.repository_id
    WHERE ${clauses.join(' AND ')}
    ORDER BY f.updated_at DESC
    LIMIT 200
  `;

  const result = await pool.query(query, params);
  return result.rows;
}

async function getById(findingId, userId) {
  const result = await pool.query(
    `SELECT f.*, r.full_name AS repository_full_name, pr.pr_number
     FROM findings f
     JOIN repositories r ON r.id = f.repository_id
     LEFT JOIN pull_requests pr ON pr.id = f.pull_request_id
     WHERE f.id = $1
       AND r.installation_id IN (SELECT installation_id FROM user_installations WHERE user_id = $2)`,
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
       WHERE f.id = $1 AND r.installation_id IN (SELECT installation_id FROM user_installations WHERE user_id = $2)`,
      [findingId, userId]
    );

    if (finding.rowCount === 0) return null;

    const statusResult = await client.query(
      `UPDATE findings
       SET status = $1,
           dismissal_reason = $2,
           updated_at = NOW(),
           last_seen_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, dismissalReason || null, findingId]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, repository_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, 'finding.status.updated', 'finding', $3, $4)`,
      [
        userId,
        finding.rows[0].repository_id,
        findingId,
        JSON.stringify({ status, dismissal_reason: dismissalReason || null }),
      ]
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

module.exports = { listByPullRequest, listAll, getById, updateStatus, listByAnalysisRun };
