const express = require('express');
const { pool, transaction } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/pull-requests/:pullRequestId/findings', authenticateToken, async (req, res) => {
  const { pullRequestId } = req.params;
  const { status = 'open', min_confidence = 0 } = req.query;

  const result = await pool.query(
    `SELECT f.*
     FROM findings f
     JOIN pull_requests pr ON pr.id = f.pull_request_id
     JOIN repositories r ON r.id = pr.repository_id
     WHERE pr.id = $1
       AND r.owner_id = $2
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
    [pullRequestId, req.user.user_id, status, Number(min_confidence)]
  );

  res.json({ findings: result.rows });
});

router.get('/findings', authenticateToken, async (req, res) => {
  const { repository_id, status = 'open', severity, category } = req.query;

  const params = [req.user.user_id];
  const clauses = ['r.owner_id = $1'];

  if (repository_id) {
    params.push(repository_id);
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
  res.json({ findings: result.rows });
});

router.get('/findings/:id', authenticateToken, async (req, res) => {
  const result = await pool.query(
    `SELECT f.*, r.full_name AS repository_full_name, pr.pr_number
     FROM findings f
     JOIN repositories r ON r.id = f.repository_id
     LEFT JOIN pull_requests pr ON pr.id = f.pull_request_id
     WHERE f.id = $1
       AND r.owner_id = $2`,
    [req.params.id, req.user.user_id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Finding not found' });
  }

  res.json({ finding: result.rows[0] });
});

router.patch('/findings/:id/status', authenticateToken, async (req, res) => {
  const { status, dismissal_reason } = req.body;
  const allowed = ['open', 'dismissed', 'accepted_risk', 'fixed'];

  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const updated = await transaction(async (client) => {
    const finding = await client.query(
      `SELECT f.id, f.repository_id
       FROM findings f
       JOIN repositories r ON r.id = f.repository_id
       WHERE f.id = $1 AND r.owner_id = $2`,
      [req.params.id, req.user.user_id]
    );

    if (finding.rowCount === 0) {
      return null;
    }

    const statusResult = await client.query(
      `UPDATE findings
       SET status = $1,
           dismissal_reason = $2,
           updated_at = NOW(),
           last_seen_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [status, dismissal_reason || null, req.params.id]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, repository_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, 'finding.status.updated', 'finding', $3, $4)`,
      [
        req.user.user_id,
        finding.rows[0].repository_id,
        req.params.id,
        JSON.stringify({ status, dismissal_reason: dismissal_reason || null }),
      ]
    );

    return statusResult.rows[0];
  });

  if (!updated) {
    return res.status(404).json({ error: 'Finding not found' });
  }

  res.json({ finding: updated });
});

module.exports = router;
