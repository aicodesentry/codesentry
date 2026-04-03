const express = require('express');
const axios = require('axios');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { getInstallationToken } = require('../services/githubApp');
const { decrypt, isEncrypted } = require('../utils/encryption');
const installationsDb = require('../db/installations');

const router = express.Router();

async function syncRepoPullRequests({ repoFullName, repoId, githubToken }) {
  const prs = [];
  for (const state of ['open', 'closed']) {
    try {
      const resp = await axios.get(
        `https://api.github.com/repos/${repoFullName}/pulls`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
          },
          params: { state, per_page: 20, sort: 'updated', direction: 'desc' },
          timeout: 15000,
        }
      );
      prs.push(...(resp.data || []));
    } catch (_) {
      // skip repos where we can't list PRs
    }
  }
  if (prs.length === 0) return 0;

  for (const pr of prs) {
    await pool.query(
      `INSERT INTO pull_requests
        (repository_id, github_pr_id, pr_number, title, body, state, head_sha, base_sha, head_branch, base_branch, author, html_url, draft, created_at, updated_at, merged_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (repository_id, pr_number)
       DO UPDATE SET
         title = EXCLUDED.title,
         state = EXCLUDED.state,
         head_sha = EXCLUDED.head_sha,
         base_sha = EXCLUDED.base_sha,
         author = EXCLUDED.author,
         html_url = EXCLUDED.html_url,
         draft = EXCLUDED.draft,
         updated_at = EXCLUDED.updated_at,
         merged_at = EXCLUDED.merged_at`,
      [
        repoId,
        pr.id,
        pr.number,
        pr.title,
        pr.body,
        pr.state,
        pr.head?.sha,
        pr.base?.sha,
        pr.head?.ref,
        pr.base?.ref,
        pr.user?.login,
        pr.html_url,
        Boolean(pr.draft),
        pr.created_at,
        pr.updated_at,
        pr.merged_at || null,
      ]
    );
  }

  return prs.length;
}

async function fetchInstallationRepositories({ installationId, githubToken }) {
  const repositories = [];

  // Prefer GitHub App installation token: this reflects app-granted repo access directly.
  try {
    const installationToken = await getInstallationToken(installationId);
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const reposResp = await axios.get('https://api.github.com/installation/repositories', {
        headers: {
          Authorization: `Bearer ${installationToken}`,
          Accept: 'application/vnd.github+json',
        },
        params: { per_page: 100, page },
        timeout: 20000,
      });

      const pageRepos = reposResp.data.repositories || [];
      repositories.push(...pageRepos);
      hasMore = pageRepos.length === 100;
      page += 1;
    }

    return repositories;
  } catch (appTokenError) {
    // Fall back to user-scoped endpoint when app credentials are unavailable.
  }

  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const reposResp = await axios.get(
      `https://api.github.com/user/installations/${installationId}/repositories`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
        },
        params: { per_page: 100, page },
        timeout: 20000,
      }
    );

    const pageRepos = reposResp.data.repositories || [];
    repositories.push(...pageRepos);
    hasMore = pageRepos.length === 100;
    page += 1;
  }

  return repositories;
}

async function grantRepositoryAccess(client, repositoryId, userIds) {
  const uniqueUserIds = [...new Set((userIds || []).filter(Boolean))];
  for (const userId of uniqueUserIds) {
    await client.query(
      `INSERT INTO repository_access (user_id, repository_id, role, updated_at)
       VALUES ($1, $2, 'admin', NOW())
       ON CONFLICT (user_id, repository_id)
       DO UPDATE SET updated_at = NOW()`,
      [userId, repositoryId]
    );
  }
}

router.get('/', authenticateToken, async (req, res) => {
  const installations = await installationsDb.listByUser(req.user.user_id);
  res.json({ installations });
});

router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT github_token FROM users WHERE id = $1',
      [req.user.user_id]
    );

    const rawToken = userResult.rows[0]?.github_token;
    if (!rawToken) {
      return res.status(400).json({ error: 'GitHub account is not connected. Please sign in again.' });
    }
    const githubToken = isEncrypted(rawToken) ? decrypt(rawToken) : rawToken;

    const response = await axios.get('https://api.github.com/user/installations', {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
      },
      timeout: 20000,
    });

    const activeInstallationIds = [];
    let synced = 0;
    let syncedRepos = 0;
    const syncErrors = [];
    for (const installation of response.data.installations || []) {
      await installationsDb.upsertInstallation(pool, installation, 'active');
      await installationsDb.linkUserInstallation(pool, req.user.user_id, installation.id);
      await installationsDb.removeSameAccountStaleLinks(pool, req.user.user_id, installation);
      activeInstallationIds.push(installation.id);
      synced += 1;

      try {
        const repositories = await fetchInstallationRepositories({
          installationId: installation.id,
          githubToken,
        });

        for (const repo of repositories) {
          const upserted = await pool.query(
            `INSERT INTO repositories
              (github_id, installation_id, owner_id, name, full_name, private, default_branch, language, html_url, clone_url, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
             ON CONFLICT (github_id)
             DO UPDATE SET
               installation_id = EXCLUDED.installation_id,
               name = EXCLUDED.name,
               full_name = EXCLUDED.full_name,
               private = EXCLUDED.private,
               default_branch = EXCLUDED.default_branch,
               language = EXCLUDED.language,
               html_url = EXCLUDED.html_url,
               clone_url = EXCLUDED.clone_url,
               updated_at = NOW()
             RETURNING id`,
            [
              repo.id,
              installation.id,
              null,
              repo.name,
              repo.full_name,
              repo.private,
              repo.default_branch || 'main',
              repo.language,
              repo.html_url,
              repo.clone_url,
            ]
          );
          await grantRepositoryAccess(pool, upserted.rows[0].id, [req.user.user_id]);
          syncedRepos += 1;
        }

        // Sync PRs only for repos that already have PR history (avoid rate limits)
        const reposWithPRs = await pool.query(
          `SELECT DISTINCT r.id, r.full_name FROM repositories r
           JOIN pull_requests pr ON pr.repository_id = r.id
           JOIN repository_access ra ON ra.repository_id = r.id
           WHERE ra.user_id = $1 AND r.installation_id = $2 AND r.is_active = true
           LIMIT 15`,
          [req.user.user_id, installation.id]
        );
        for (const row of reposWithPRs.rows) {
          try {
            await syncRepoPullRequests({
              repoFullName: row.full_name,
              repoId: row.id,
              githubToken,
            });
          } catch (_) {
            // PR sync is non-fatal
          }
        }
      } catch (repoSyncError) {
        syncErrors.push({
          installation_id: installation.id,
          error: repoSyncError.response?.data?.message || repoSyncError.message,
          status: repoSyncError.response?.status || null,
        });
      }
    }

    await installationsDb.reconcileUserInstallations(pool, req.user.user_id, activeInstallationIds);
    await installationsDb.deleteUnreferencedInstallations(pool);

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
