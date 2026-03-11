const express = require('express');
const axios = require('axios');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { createAppJwt } = require('../services/githubApp');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const result = await pool.query(
    `SELECT DISTINCT i.id, i.account_login, i.account_type, i.status, i.updated_at
     FROM installations i
     JOIN repositories r ON r.installation_id = i.id
     WHERE r.owner_id = $1
     ORDER BY i.updated_at DESC`,
    [req.user.user_id]
  );

  res.json({ installations: result.rows });
});

router.post('/sync', authenticateToken, async (_req, res) => {
  if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
    return res.status(400).json({ error: 'GitHub App credentials are not configured' });
  }

  try {
    const jwt = createAppJwt();
    const response = await axios.get('https://api.github.com/app/installations', {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
      },
      timeout: 20000,
    });

    let synced = 0;
    for (const installation of response.data) {
      await pool.query(
        `INSERT INTO installations (id, account_login, account_type, target_type, html_url, permissions, events, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
         ON CONFLICT (id)
         DO UPDATE SET
           account_login = EXCLUDED.account_login,
           account_type = EXCLUDED.account_type,
           target_type = EXCLUDED.target_type,
           html_url = EXCLUDED.html_url,
           permissions = EXCLUDED.permissions,
           events = EXCLUDED.events,
           status = 'active',
           updated_at = NOW()`,
        [
          installation.id,
          installation.account?.login,
          installation.account?.type,
          installation.target_type,
          installation.html_url,
          JSON.stringify(installation.permissions || {}),
          installation.events || [],
        ]
      );
      synced += 1;
    }

    res.json({ success: true, synced_installations: synced });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to sync installations',
      details: error.response?.data || error.message,
    });
  }
});

module.exports = router;
