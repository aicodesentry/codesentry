const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const prDb = require('../db/pullRequests');

const router = express.Router();

router.get('/repositories/:repositoryId/pull-requests', authenticateToken, async (req, res) => {
  const { repositoryId } = req.params;

  const exists = await prDb.checkOwnership(repositoryId, req.user.user_id);
  if (!exists) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  const pull_requests = await prDb.listByRepository(repositoryId);
  res.json({ pull_requests });
});

module.exports = router;
