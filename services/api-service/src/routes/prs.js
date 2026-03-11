const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/repositories/:repositoryId/pull-requests', authenticateToken, async (req, res) => {
  const { repositoryId } = req.params;

  const repoCheck = await pool.query(
    'SELECT id FROM repositories WHERE id = $1 AND owner_id = $2',
    [repositoryId, req.user.user_id]
  );

  if (repoCheck.rowCount === 0) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  const result = await pool.query(
    `SELECT
       pr.id,
       pr.pr_number,
       pr.title,
       pr.state,
       pr.author,
       pr.head_sha,
       pr.base_sha,
       pr.created_at,
       pr.updated_at,
       ar.id AS latest_run_id,
       ar.status AS latest_run_status,
       ar.completed_at AS latest_run_completed_at,
       COUNT(f.id) FILTER (WHERE f.status = 'open') AS open_findings_count,
       COUNT(f.id) FILTER (WHERE f.severity = 'critical' AND f.status = 'open') AS critical_count,
       COUNT(f.id) FILTER (WHERE f.severity = 'high' AND f.status = 'open') AS high_count
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

  res.json({ pull_requests: result.rows });
});

module.exports = router;
