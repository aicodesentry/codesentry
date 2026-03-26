const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/events', authenticateToken, async (req, res) => {
  const rawLimit = parseInt(req.query.limit || '50', 10);
  const rawOffset = parseInt(req.query.offset || '0', 10);
  const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? 50 : rawLimit, 1), 200);
  const offset = Math.max(Number.isNaN(rawOffset) ? 0 : rawOffset, 0);

  try {
    const eventsResult = await pool.query(
      `SELECT
         pr.id,
         r.full_name AS repository_name,
         pr.head_branch AS branch_name,
         pr.author AS sender_username,
         pr.pr_number,
         pr.html_url AS pr_url,
         CASE
           WHEN pr.state = 'closed' THEN 'closed'
           ELSE 'opened'
         END AS action,
         COALESCE(pr.updated_at, pr.created_at) AS received_at
       FROM pull_requests pr
       JOIN repositories r ON r.id = pr.repository_id
       WHERE r.owner_id = $1
       ORDER BY COALESCE(pr.updated_at, pr.created_at) DESC
       LIMIT $2 OFFSET $3`,
      [req.user.user_id, limit, offset]
    );

    const totalResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM pull_requests pr
       JOIN repositories r ON r.id = pr.repository_id
       WHERE r.owner_id = $1`,
      [req.user.user_id]
    );

    res.json({
      events: eventsResult.rows,
      total: parseInt(totalResult.rows[0]?.total || '0', 10),
      limit,
      offset,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch webhook events',
      details: error.message,
    });
  }
});

module.exports = router;
