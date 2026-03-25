const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
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
     LEFT JOIN pull_requests pr ON pr.repository_id = r.id
     LEFT JOIN findings f ON f.repository_id = r.id
     WHERE r.owner_id = $1
     GROUP BY r.id
     ORDER BY r.is_active DESC, r.updated_at DESC`,
    [req.user.user_id]
  );

  res.json({ repositories: rows.rows });
});

router.get('/:id', authenticateToken, async (req, res) => {
  const repo = await pool.query(
    `SELECT *
     FROM repositories
     WHERE id = $1 AND owner_id = $2`,
    [req.params.id, req.user.user_id]
  );

  if (repo.rowCount === 0) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  const summary = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'open') AS open_findings,
       COUNT(*) FILTER (WHERE status = 'dismissed') AS dismissed_findings,
       COUNT(*) FILTER (WHERE status = 'accepted_risk') AS accepted_risk_findings,
       COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'open') AS critical_open,
       COUNT(*) FILTER (WHERE severity = 'high' AND status = 'open') AS high_open
     FROM findings
     WHERE repository_id = $1`,
    [req.params.id]
  );

  res.json({ repository: repo.rows[0], summary: summary.rows[0] });
});

router.post('/:id/connect', authenticateToken, async (req, res) => {
  const updated = await pool.query(
    `UPDATE repositories
     SET is_active = true, updated_at = NOW()
     WHERE id = $1 AND owner_id = $2
     RETURNING id, full_name, is_active`,
    [req.params.id, req.user.user_id]
  );

  if (updated.rowCount === 0) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  res.json({ repository: updated.rows[0], connected: true });
});

router.post('/:id/disconnect', authenticateToken, async (req, res) => {
  const updated = await pool.query(
    `UPDATE repositories
     SET is_active = false, updated_at = NOW()
     WHERE id = $1 AND owner_id = $2
     RETURNING id, full_name, is_active`,
    [req.params.id, req.user.user_id]
  );

  if (updated.rowCount === 0) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  res.json({ repository: updated.rows[0], connected: false });
});

router.patch('/:id/baseline', authenticateToken, async (req, res) => {
  const { enabled = true } = req.body;

  const updated = await pool.query(
    `UPDATE repositories
     SET baseline_set = $1,
         updated_at = NOW()
     WHERE id = $2 AND owner_id = $3
     RETURNING id, baseline_set`,
    [Boolean(enabled), req.params.id, req.user.user_id]
  );

  if (updated.rowCount === 0) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  res.json({ repository: updated.rows[0] });
});

module.exports = router;
