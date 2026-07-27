const express = require('express');
const crypto = require('crypto');
const {
  createCheckRun,
  fetchFileContents,
  fetchPullRequestFiles,
  postInlineComment,
  submitPullRequestReview,
} = require('../services/githubInternalOperations');

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

function sendOperationError(res, fallbackMessage, error) {
  const status = error.statusCode || 502;
  return res.status(status).json({
    error: error.message || fallbackMessage,
    ...(error.detail ? { detail: error.detail } : {}),
  });
}

function routeOperation(operation, fallbackMessage) {
  return async (req, res) => {
    try {
      return res.json(await operation(req.body || {}));
    } catch (error) {
      return sendOperationError(res, fallbackMessage, error);
    }
  };
}

router.use(ensureInternalAuth);

router.post('/github/pulls/files', routeOperation(
  fetchPullRequestFiles,
  'Failed to fetch pull request files from GitHub'
));

router.post('/github/files/content', routeOperation(
  fetchFileContents,
  'Failed to fetch file contents from GitHub'
));

router.post('/github/reviews/submit', routeOperation(
  submitPullRequestReview,
  'Failed to submit review'
));

router.post('/github/comments/inline', routeOperation(
  postInlineComment,
  'Failed to post inline comment'
));

router.post('/github/check-runs', routeOperation(
  createCheckRun,
  'Failed to create check run'
));

module.exports = router;
