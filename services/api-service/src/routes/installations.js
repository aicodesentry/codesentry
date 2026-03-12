const express = require('express');
const axios = require('axios');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const result = await pool.query(
    `SELECT
       i.id,
       i.account_login,
       i.account_type,
       i.status,
       i.updated_at,
       COUNT(r.id) FILTER (WHERE r.is_active = true) AS repository_count
     FROM installations i
     JOIN user_installations ui ON ui.installation_id = i.id
     LEFT JOIN repositories r ON r.installation_id = i.id AND r.owner_id = $1
     WHERE ui.user_id = $1
     GROUP BY i.id
     ORDER BY i.updated_at DESC`,
    [req.user.user_id]
  );

  res.json({ installations: result.rows });
});

router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT github_token FROM users WHERE id = $1',
      [req.user.user_id]
    );

    const githubToken = userResult.rows[0]?.github_token;
    if (!githubToken) {
      return res.status(400).json({ error: 'GitHub account is not connected. Please sign in again.' });
    }

    const response = await axios.get('https://api.github.com/user/installations', {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
      },
      timeout: 20000,
    });

    let synced = 0;
    let syncedRepos = 0;
    const syncErrors = [];
    for (const installation of response.data.installations || []) {
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
      await pool.query(
        `INSERT INTO user_installations (user_id, installation_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, installation_id)
         DO UPDATE SET updated_at = NOW()`,
        [req.user.user_id, installation.id]
      );
      synced += 1;

      try {
        await pool.query(
          `UPDATE repositories
           SET is_active = false, updated_at = NOW()
           WHERE owner_id = $1 AND installation_id = $2`,
          [req.user.user_id, installation.id]
        );

        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const reposResp = await axios.get(
            `https://api.github.com/user/installations/${installation.id}/repositories`,
            {
              headers: {
                Authorization: `Bearer ${githubToken}`,
                Accept: 'application/vnd.github+json',
              },
              params: { per_page: 100, page },
              timeout: 20000,
            }
          );

          const repositories = reposResp.data.repositories || [];
          for (const repo of repositories) {
            await pool.query(
              `INSERT INTO repositories
                (github_id, installation_id, owner_id, name, full_name, private, default_branch, language, html_url, clone_url, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
               ON CONFLICT (github_id)
               DO UPDATE SET
                 installation_id = EXCLUDED.installation_id,
                 owner_id = EXCLUDED.owner_id,
                 name = EXCLUDED.name,
                 full_name = EXCLUDED.full_name,
                 private = EXCLUDED.private,
                 default_branch = EXCLUDED.default_branch,
                 language = EXCLUDED.language,
                 html_url = EXCLUDED.html_url,
                 clone_url = EXCLUDED.clone_url,
                 is_active = true,
                 updated_at = NOW()`,
              [
                repo.id,
                installation.id,
                req.user.user_id,
                repo.name,
                repo.full_name,
                repo.private,
                repo.default_branch || 'main',
                repo.language,
                repo.html_url,
                repo.clone_url,
              ]
            );
            syncedRepos += 1;
          }

          hasMore = repositories.length === 100;
          page += 1;
        }
      } catch (repoSyncError) {
        syncErrors.push({
          installation_id: installation.id,
          error: repoSyncError.response?.data?.message || repoSyncError.message,
          status: repoSyncError.response?.status || null,
        });
      }
    }

    if (syncErrors.length) {
      return res.status(207).json({
        success: true,
        synced_installations: synced,
        synced_repositories: syncedRepos,
        sync_errors: syncErrors,
      });
    }

    res.json({ success: true, synced_installations: synced, synced_repositories: syncedRepos });
  } catch (error) {
    console.error('Installation sync failed', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to sync installations',
      details: error.response?.data || error.message,
    });
  }
});

module.exports = router;
