const { pool } = require('../config/database');

async function list(userId) {
  const rows = await pool.query(
    `SELECT
       r.id,
       r.github_id,
       r.installation_id,
       r.name,
       r.full_name,
       r.private,
       r.default_branch,
       r.language,
       r.html_url,
       r.is_active,
       r.baseline_set,
       r.updated_at,
       COUNT(DISTINCT pr.id) AS pull_request_count,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'open') AS open_findings_count,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'accepted_risk') AS accepted_risk_count
     FROM repositories r
     JOIN user_installations ui ON ui.installation_id = r.installation_id AND ui.user_id = $1
     LEFT JOIN pull_requests pr ON pr.repository_id = r.id
     LEFT JOIN findings f ON f.repository_id = r.id
     GROUP BY r.id
     ORDER BY r.is_active DESC, r.updated_at DESC`,
    [userId]
  );
  return rows.rows;
}

async function getById(repoId, userId) {
  const repo = await pool.query(
    `SELECT r.*
     FROM repositories r
     JOIN user_installations ui ON ui.installation_id = r.installation_id AND ui.user_id = $2
     WHERE r.id = $1`,
    [repoId, userId]
  );

  if (repo.rowCount === 0) return null;

  const summary = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'open') AS open_findings,
       COUNT(*) FILTER (WHERE status = 'dismissed') AS dismissed_findings,
       COUNT(*) FILTER (WHERE status = 'accepted_risk') AS accepted_risk_findings,
       COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'open') AS critical_open,
       COUNT(*) FILTER (WHERE severity = 'high' AND status = 'open') AS high_open
     FROM findings
     WHERE repository_id = $1`,
    [repoId]
  );

  return { repository: repo.rows[0], summary: summary.rows[0] };
}

async function updateBaseline(repoId, userId, enabled) {
  const updated = await pool.query(
    `UPDATE repositories
     SET baseline_set = $1, updated_at = NOW()
     WHERE id = $2
       AND installation_id IN (SELECT installation_id FROM user_installations WHERE user_id = $3)
     RETURNING id, baseline_set`,
    [Boolean(enabled), repoId, userId]
  );
  return updated.rowCount > 0 ? updated.rows[0] : null;
}

async function connect(repoId, userId) {
  const updated = await pool.query(
    `UPDATE repositories
     SET is_active = true, updated_at = NOW()
     WHERE id = $1
       AND installation_id IN (SELECT installation_id FROM user_installations WHERE user_id = $2)
     RETURNING id, full_name, is_active`,
    [repoId, userId]
  );
  return updated.rowCount > 0 ? updated.rows[0] : null;
}

async function disconnect(repoId, userId) {
  const updated = await pool.query(
    `UPDATE repositories
     SET is_active = false, updated_at = NOW()
     WHERE id = $1
       AND installation_id IN (SELECT installation_id FROM user_installations WHERE user_id = $2)
     RETURNING id, full_name, is_active`,
    [repoId, userId]
  );
  return updated.rowCount > 0 ? updated.rows[0] : null;
}

module.exports = { list, getById, updateBaseline, connect, disconnect };
