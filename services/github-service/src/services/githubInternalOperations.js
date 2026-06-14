const axios = require('axios');
const githubAppAuth = require('./githubAppAuth');

class OperationError extends Error {
  constructor(message, statusCode = 500, detail = null) {
    super(message);
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

function badRequest(message) {
  return new OperationError(message, 400);
}

function externalError(message, error) {
  return new OperationError(message, 502, error.response?.data || error.message);
}

function validateRepositoryFullName(repositoryFullName) {
  if (!repositoryFullName || !repositoryFullName.includes('/') || repositoryFullName.split('/').length !== 2) {
    throw badRequest('Invalid repository_full_name format');
  }
  return repositoryFullName.split('/');
}

function validateOwnerRepo(owner, repo) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(owner || '') || !/^[a-zA-Z0-9_.-]+$/.test(repo || '')) {
    throw badRequest('Invalid owner or repo format');
  }
}

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

async function fetchPullRequestFiles({ repository_full_name, pull_request_number, installation_id }) {
  if (!repository_full_name || !pull_request_number || !installation_id) {
    throw badRequest('repository_full_name, pull_request_number and installation_id are required');
  }

  const [owner, repo] = validateRepositoryFullName(repository_full_name);

  try {
    const token = await githubAppAuth.getInstallationToken(installation_id);
    const files = [];
    let page = 1;

    for (;;) {
      const response = await githubRequest(
        'get',
        `https://api.github.com/repos/${owner}/${repo}/pulls/${pull_request_number}/files?per_page=100&page=${page}`,
        token
      );
      files.push(...response.data);
      if (response.data.length < 100) break;
      page += 1;
    }

    return {
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
    };
  } catch (error) {
    if (error instanceof OperationError) throw error;
    throw externalError('Failed to fetch pull request files from GitHub', error);
  }
}

async function fetchFileContents({ repository_full_name, installation_id, ref, paths }) {
  if (!repository_full_name || !installation_id || !ref || !Array.isArray(paths)) {
    throw badRequest('repository_full_name, installation_id, ref and paths are required');
  }

  const [owner, repo] = validateRepositoryFullName(repository_full_name);

  try {
    const token = await githubAppAuth.getInstallationToken(installation_id);
    const files = [];

    for (const path of paths.slice(0, 200)) {
      if (!path || typeof path !== 'string') continue;
      const encodedPath = path.split('/').map(encodeURIComponent).join('/');
      const response = await githubRequest(
        'get',
        `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`,
        token
      );
      const content = typeof response.data === 'string'
        ? response.data
        : Buffer.from(response.data.content || '', 'base64').toString('utf8');

      if (Buffer.byteLength(content || '', 'utf8') > 500000) continue;
      files.push({ path, content });
    }

    return { files };
  } catch (error) {
    if (error instanceof OperationError) throw error;
    throw externalError('Failed to fetch file contents from GitHub', error);
  }
}

async function submitPullRequestReview({ owner, repo, pr_number, installation_id, commit_sha, body, event, comments }) {
  if (!owner || !repo || !pr_number || !installation_id || !commit_sha || !body || !event) {
    throw badRequest('owner, repo, pr_number, installation_id, commit_sha, body, event are required');
  }
  validateOwnerRepo(owner, repo);

  try {
    const token = await githubAppAuth.getInstallationToken(installation_id);
    const existingReviews = await githubRequest(
      'get',
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}/reviews?per_page=100`,
      token
    );

    for (const review of existingReviews.data) {
      if (review.body?.includes('<!-- mitig8it-review -->') && review.state === 'CHANGES_REQUESTED') {
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

    return {
      review_id: response.data.id,
      comments_posted: (comments || []).length,
    };
  } catch (error) {
    if (error instanceof OperationError) throw error;
    throw externalError('Failed to submit review', error);
  }
}

async function postInlineComment({ owner, repo, pr_number, installation_id, commit_sha, path, line, body }) {
  if (!owner || !repo || !pr_number || !installation_id || !commit_sha || !path || !line || !body) {
    throw badRequest('owner, repo, pr_number, installation_id, commit_sha, path, line and body are required');
  }
  validateOwnerRepo(owner, repo);

  try {
    const token = await githubAppAuth.getInstallationToken(installation_id);
    const response = await githubRequest(
      'post',
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pr_number}/comments`,
      token,
      {
        body,
        commit_id: commit_sha,
        path,
        line,
        side: 'RIGHT',
      }
    );

    return {
      comment_id: response.data.id,
      url: response.data.html_url,
      success: true,
    };
  } catch (error) {
    if (error instanceof OperationError) throw error;
    throw externalError('Failed to post inline comment', error);
  }
}

async function createCheckRun({ owner, repo, installation_id, head_sha, conclusion, title, summary }) {
  if (!owner || !repo || !installation_id || !head_sha || !conclusion || !title || !summary) {
    throw badRequest('owner, repo, installation_id, head_sha, conclusion, title and summary are required');
  }

  try {
    const token = await githubAppAuth.getInstallationToken(installation_id);
    const response = await githubRequest(
      'post',
      `https://api.github.com/repos/${owner}/${repo}/check-runs`,
      token,
      {
        name: 'Mitig8it Security Review',
        head_sha,
        status: 'completed',
        conclusion,
        output: { title, summary },
      }
    );
    return { check_run_id: response.data.id };
  } catch (error) {
    if (error instanceof OperationError) throw error;
    throw externalError('Failed to create check run', error);
  }
}

module.exports = {
  OperationError,
  createCheckRun,
  fetchFileContents,
  fetchPullRequestFiles,
  githubRequest,
  postInlineComment,
  submitPullRequestReview,
};
