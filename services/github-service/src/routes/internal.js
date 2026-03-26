const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const githubAppAuth = require('../services/githubAppAuth');

const router = express.Router();

function ensureInternalAuth(req, res, next) {
  const expected = process.env.GITHUB_SERVICE_INTERNAL_SECRET;
  if (!expected) {
    return res.status(500).json({ error: 'Internal secret is not configured' });
  }
  const provided = req.headers['x-internal-secret'] || '';
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(ensureInternalAuth);

async function githubRequest(method, url, token, data) {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await axios({
        method,
        url,
        data,
        timeout: 25000,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
    } catch (error) {
      const status = error.response?.status;
      const retryable = [429, 500, 502, 503, 504].includes(status);
      if (!retryable || attempt === maxAttempts) throw error;
      const delayMs = 1000 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

router.post('/github/pulls/files', async (req, res) => {
  const { repository_full_name, pull_request_number, installation_id } = req.body || {};
  if (!repository_full_name || !pull_request_number || !installation_id) {
    return res.status(400).json({ error: 'repository_full_name, pull_request_number and installation_id are required' });
  }
  if (!repository_full_name.includes('/') || repository_full_name.split('/').length !== 2) {
    return res.status(400).json({ error: 'Invalid repository_full_name format' });
  }

  try {
    const token = await githubAppAuth.getInstallationToken(installation_id);
    const [owner, repo] = repository_full_name.split('/');
    const files = [];
    let page = 1;

    while (true) {
      const response = await githubRequest(
        'get',
        `https://api.github.com/repos/${owner}/${repo}/pulls/${pull_request_number}/files?per_page=100&page=${page}`,
        token
      );
      files.push(...response.data);
      if (response.data.length < 100) break;
      page += 1;
    }

    return res.json({
      files: files
        .filter((f) => ['added', 'modified', 'renamed'].includes(f.status))
        .filter((f) => !f.filename.startsWith('dist/') && !f.filename.includes('node_modules'))
        .slice(0, 200)
        .map((f) => ({
          path: f.filename,
          patch: f.patch || '',
          additions: f.additions,
          deletions: f.deletions,
          status: f.status,
          raw_url: f.raw_url,
        })),
    });
  } catch (error) {
    return res.status(502).json({
      error: 'Failed to fetch pull request files from GitHub',
      detail: error.response?.data || error.message,
    });
  }
});

router.post('/github/reviews/submit', async (req, res) => {
  const { owner, repo, pr_number, installation_id, commit_sha, body, event, comments } = req.body || {};
  if (!owner || !repo || !pr_number || !installation_id || !commit_sha || !body || !event) {
    return res.status(400).json({ error: 'owner, repo, pr_number, installation_id, commit_sha, body, event are required' });
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo)) {
    return res.status(400).json({ error: 'Invalid owner or repo format' });
  }

  try {
    const token = await githubAppAuth.getInstallationToken(installation_id);

    // Dismiss previous CodeSentry reviews so only the latest is visible
    const existingReviews = await githubRequest(
      'get',
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}/reviews?per_page=100`,
      token
    );
    for (const review of existingReviews.data) {
      if (review.body?.includes('<!-- codesentry-review -->') && review.state === 'CHANGES_REQUESTED') {
        try {
          await githubRequest(
            'put',
            `https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}/reviews/${review.id}/dismissals`,
            token,
            { message: 'Superseded by new analysis run.' }
          );
        } catch (_) { /* best effort */ }
      }
    }

    const reviewPayload = {
      commit_id: commit_sha,
      body,
      event,
      comments: (comments || []).map((c) => ({
        path: c.path,
        line: c.line || 1,
        side: 'RIGHT',
        body: c.body,
      })),
    };

    const response = await githubRequest(
      'post',
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}/reviews`,
      token,
      reviewPayload
    );

    return res.json({
      review_id: response.data.id,
      comments_posted: (comments || []).length,
    });
  } catch (error) {
    return res.status(502).json({
      error: 'Failed to submit review',
      detail: error.response?.data || error.message,
    });
  }
});

router.post('/github/check-runs', async (req, res) => {
  const { owner, repo, installation_id, head_sha, conclusion, title, summary } = req.body || {};
  if (!owner || !repo || !installation_id || !head_sha || !conclusion || !title || !summary) {
    return res.status(400).json({ error: 'owner, repo, installation_id, head_sha, conclusion, title and summary are required' });
  }

  try {
    const token = await githubAppAuth.getInstallationToken(installation_id);
    const response = await githubRequest(
      'post',
      `https://api.github.com/repos/${owner}/${repo}/check-runs`,
      token,
      {
        name: 'CodeSentry Security Review',
        head_sha,
        status: 'completed',
        conclusion,
        output: { title, summary },
      }
    );
    return res.json({ check_run_id: response.data.id });
  } catch (error) {
    return res.status(502).json({
      error: 'Failed to create check run',
      detail: error.response?.data || error.message,
    });
  }
});

module.exports = router;
