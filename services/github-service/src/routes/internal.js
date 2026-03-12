const express = require('express');
const axios = require('axios');
const githubAppAuth = require('../services/githubAppAuth');

const router = express.Router();

function ensureInternalAuth(req, res, next) {
  const expected = process.env.GITHUB_SERVICE_INTERNAL_SECRET;
  if (!expected) {
    return res.status(500).json({ error: 'Internal secret is not configured' });
  }
  if (req.headers['x-internal-secret'] !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(express.json({ limit: '1mb' }));
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

router.post('/github/comments/summary-upsert', async (req, res) => {
  const { owner, repo, pr_number, installation_id, body, marker } = req.body || {};
  if (!owner || !repo || !pr_number || !installation_id || !body || !marker) {
    return res.status(400).json({ error: 'owner, repo, pr_number, installation_id, body, marker are required' });
  }

  try {
    const token = await githubAppAuth.getInstallationToken(installation_id);
    const existingResp = await githubRequest(
      'get',
      `https://api.github.com/repos/${owner}/${repo}/issues/${pr_number}/comments?per_page=100`,
      token
    );
    const existing = existingResp.data.find((comment) => comment.body?.includes(marker));

    if (existing) {
      const updated = await githubRequest(
        'patch',
        `https://api.github.com/repos/${owner}/${repo}/issues/comments/${existing.id}`,
        token,
        { body }
      );
      return res.json({ comment_id: updated.data.id, action: 'updated' });
    }

    const created = await githubRequest(
      'post',
      `https://api.github.com/repos/${owner}/${repo}/issues/${pr_number}/comments`,
      token,
      { body }
    );
    return res.json({ comment_id: created.data.id, action: 'created' });
  } catch (error) {
    return res.status(502).json({
      error: 'Failed to upsert summary comment',
      detail: error.response?.data || error.message,
    });
  }
});

router.post('/github/comments/inline', async (req, res) => {
  const { owner, repo, pr_number, installation_id, commit_sha, findings } = req.body || {};
  if (!owner || !repo || !pr_number || !installation_id || !commit_sha || !Array.isArray(findings)) {
    return res.status(400).json({ error: 'owner, repo, pr_number, installation_id, commit_sha and findings[] are required' });
  }

  try {
    const token = await githubAppAuth.getInstallationToken(installation_id);
    const posted = [];
    const failed = [];

    for (const finding of findings) {
      try {
        const response = await githubRequest(
          'post',
          `https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}/comments`,
          token,
          {
            body: finding.body,
            commit_id: commit_sha,
            path: finding.file_path,
            line: finding.line_start || 1,
            side: 'RIGHT',
          }
        );
        posted.push({ finding_id: finding.finding_id, comment_id: response.data.id });
      } catch (error) {
        failed.push({
          finding_id: finding.finding_id,
          status: error.response?.status || 500,
          detail: error.response?.data || error.message,
        });
      }
    }

    return res.json({ posted, failed });
  } catch (error) {
    return res.status(502).json({
      error: 'Failed to post inline comments',
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
