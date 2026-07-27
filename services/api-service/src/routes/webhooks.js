const express = require('express');
const { pool, transaction } = require('../config/database');
const { verifyWebhookSignature } = require('../services/githubApp');
const { notifyAnalysisQueued } = require('../services/prAnalysisOrchestrator');
const logger = require('../utils/logger');
const installationsDb = require('../db/installations');
const repositoriesDb = require('../db/repositories');

const router = express.Router();

function getBodyBuffer(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  return Buffer.from(JSON.stringify(req.body || {}));
}

async function grantRepositoryAccess(client, repositoryId, installationId) {
  const accessRows = await client.query(
    'SELECT user_id FROM user_installations WHERE installation_id = $1',
    [installationId]
  );

  for (const row of accessRows.rows) {
    await client.query(
      `INSERT INTO repository_access (user_id, repository_id, role, updated_at)
       VALUES ($1, $2, 'admin', NOW())
       ON CONFLICT (user_id, repository_id)
       DO UPDATE SET updated_at = NOW()`,
      [row.user_id, repositoryId]
    );
  }
}

router.post('/github', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];
  const deliveryId = req.headers['x-github-delivery'];
  const correlationId = req.correlationId;
  let analysisPayload = null;

  if (!event || !deliveryId) {
    return res.status(400).json({ error: 'Missing webhook headers' });
  }

  const rawBody = getBodyBuffer(req);
  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(rawBody.toString('utf8'));

  try {
    const existing = await pool.query(
      'SELECT id, processing_status FROM webhook_deliveries WHERE delivery_id = $1',
      [deliveryId]
    );

    if (existing.rowCount > 0) {
      return res.status(200).json({ success: true, deduplicated: true });
    }

    await pool.query(
      `INSERT INTO webhook_deliveries (delivery_id, event_type, action, processing_status, received_at)
       VALUES ($1, $2, $3, 'received', NOW())`,
      [deliveryId, event, payload.action || null]
    );

    if (event === 'installation' && payload.installation) {
      await installationsDb.upsertInstallation(
        pool,
        payload.installation,
        payload.action === 'deleted' ? 'deleted' : 'active'
      );
    }

    if (event === 'installation_repositories' && payload.installation?.id && payload.repositories_added) {
      for (const repo of payload.repositories_added) {
        const repoResult = await pool.query(
          `INSERT INTO repositories
            (github_id, installation_id, name, full_name, private, default_branch, language, html_url, clone_url, is_active, owner_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, NULL)
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
            payload.installation.id,
            repo.name,
            repo.full_name,
            repo.private,
            repo.default_branch || 'main',
            repo.language,
            repo.html_url,
            repo.clone_url,
          ]
        );
        await grantRepositoryAccess(pool, repoResult.rows[0].id, payload.installation.id);
        await repositoriesDb.queueForProfiling(repoResult.rows[0].id, 0);
      }
    }

    if (event === 'pull_request' && ['closed'].includes(payload.action)) {
      const repository = payload.repository;
      const pr = payload.pull_request;
      const newState = pr.merged ? 'merged' : 'closed';
      const mergedAt = pr.merged_at || null;

      await pool.query(
        `UPDATE pull_requests SET state = $1, merged_at = $2, updated_at = NOW()
         WHERE repository_id = (SELECT id FROM repositories WHERE github_id = $3)
           AND pr_number = $4`,
        [newState, mergedAt, repository.id, pr.number]
      );

      // Mark profile stale if security-relevant files were changed in a merged PR
      if (pr.merged) {
        const { shouldRetriggerProfile } = require('../services/profileWorker');
        const changedFiles = (pr.changed_files_list || []).map((f) => f.filename || f);
        if (changedFiles.length > 0 && shouldRetriggerProfile(changedFiles)) {
          const repoRow = await pool.query('SELECT id FROM repositories WHERE github_id = $1', [repository.id]);
          if (repoRow.rows[0]) {
            await repositoriesDb.markProfileStale(repoRow.rows[0].id);
          }
        }
      }
    }

    if (event === 'pull_request' && ['opened', 'synchronize', 'reopened'].includes(payload.action)) {
      const repository = payload.repository;
      const pr = payload.pull_request;
      const installationId = payload.installation?.id;

      if (!installationId) {
        throw new Error('Pull request webhook missing installation id');
      }

      await transaction(async (client) => {
        const repoUpsert = await client.query(
          `INSERT INTO repositories
            (github_id, installation_id, owner_id, name, full_name, private, default_branch, language, html_url, clone_url, is_active)
           VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, false)
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
            repository.id,
            installationId,
            repository.name,
            repository.full_name,
            repository.private,
            repository.default_branch || 'main',
            repository.language,
            repository.html_url,
            repository.clone_url,
          ]
        );
        await grantRepositoryAccess(client, repoUpsert.rows[0].id, installationId);

        const repoResult = await client.query('SELECT id, baseline_set, is_active FROM repositories WHERE github_id = $1', [
          repository.id,
        ]);
        const repoId = repoResult.rows[0].id;

        const prResult = await client.query(
          `INSERT INTO pull_requests
            (repository_id, github_pr_id, pr_number, title, body, state, head_sha, base_sha, head_branch, base_branch, author, html_url, draft)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (repository_id, pr_number)
           DO UPDATE SET
             title = EXCLUDED.title,
             body = EXCLUDED.body,
             state = EXCLUDED.state,
             head_sha = EXCLUDED.head_sha,
             base_sha = EXCLUDED.base_sha,
             head_branch = EXCLUDED.head_branch,
             base_branch = EXCLUDED.base_branch,
             author = EXCLUDED.author,
             html_url = EXCLUDED.html_url,
             draft = EXCLUDED.draft,
             updated_at = NOW()
           RETURNING id`,
          [
            repoId,
            pr.id,
            pr.number,
            pr.title,
            pr.body,
            pr.state,
            pr.head.sha,
            pr.base.sha,
            pr.head.ref,
            pr.base.ref,
            pr.user?.login,
            pr.html_url,
            Boolean(pr.draft),
          ]
        );

        if (repoResult.rows[0].is_active) {
          const run = await client.query(
            `INSERT INTO analysis_runs
              (repository_id, pull_request_id, pr_number, commit_sha, status, triggered_by)
             VALUES ($1, $2, $3, $4, 'pending', 'webhook')
             RETURNING id`,
            [repoId, prResult.rows[0].id, pr.number, pr.head.sha]
          );

          analysisPayload = {
            correlation_id: correlationId,
            delivery_id: deliveryId,
            analysis_run_id: run.rows[0].id,
            repository_id: repoId,
            repository_github_id: repository.id,
            repository_full_name: repository.full_name,
            installation_id: installationId,
            pull_request_id: prResult.rows[0].id,
            pull_request_number: pr.number,
            commit_sha: pr.head.sha,
            base_sha: pr.base.sha,
            baseline_set: repoResult.rows[0].baseline_set,
          };
        }
      });
    }

    await pool.query(
      `UPDATE webhook_deliveries
       SET processing_status = 'processed', processed_at = NOW()
       WHERE delivery_id = $1`,
      [deliveryId]
    );

    if (analysisPayload) {
      notifyAnalysisQueued();
    }

    res.status(200).json({ success: true, analysis_queued: Boolean(analysisPayload) });
  } catch (error) {
    logger.error('Webhook processing failed', {
      deliveryId,
      event,
      error: error.message,
    });

    await pool.query(
      `UPDATE webhook_deliveries
       SET processing_status = 'failed', error_message = $2, processed_at = NOW()
       WHERE delivery_id = $1`,
      [deliveryId, error.message]
    );

    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
