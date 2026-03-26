const { pool } = require('../config/database');

async function checkOwnership(repositoryId, userId) {
  const result = await pool.query(
    'SELECT id FROM repositories WHERE id = $1 AND owner_id = $2',
    [repositoryId, userId]
  );
  return result.rowCount > 0;
}

async function listByRepository(repositoryId) {
  const result = await pool.query(
    `SELECT
       pr.id,
       pr.pr_number,
       pr.title,
       pr.state,
       pr.author,
       pr.head_sha,
       pr.base_sha,
       pr.html_url,
       pr.draft,
       pr.merged_at,
       pr.created_at,
       pr.updated_at,
       ar.id AS latest_run_id,
       ar.status AS latest_run_status,
       ar.completed_at AS latest_run_completed_at,
       COUNT(f.id) FILTER (WHERE f.status = 'open') AS open_findings_count,
       COUNT(f.id) FILTER (WHERE f.severity = 'critical' AND f.status = 'open') AS critical_count,
       COUNT(f.id) FILTER (WHERE f.severity = 'high' AND f.status = 'open') AS high_count,
       COUNT(f.id) FILTER (WHERE f.severity = 'medium' AND f.status = 'open') AS medium_count,
       COUNT(f.id) FILTER (WHERE f.severity = 'low' AND f.status = 'open') AS low_count
     FROM pull_requests pr
     LEFT JOIN LATERAL (
       SELECT id, status, completed_at
       FROM analysis_runs
       WHERE pull_request_id = pr.id
       ORDER BY created_at DESC
       LIMIT 1
     ) ar ON true
     LEFT JOIN findings f ON f.pull_request_id = pr.id
     WHERE pr.repository_id = $1
     GROUP BY pr.id, ar.id, ar.status, ar.completed_at
     ORDER BY pr.updated_at DESC
     LIMIT 100`,
    [repositoryId]
  );
  return result.rows;
}

module.exports = { checkOwnership, listByRepository };
