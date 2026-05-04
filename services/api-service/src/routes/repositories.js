const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const repoDb = require('../db/repositories');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const repositories = await repoDb.list(req.user.user_id);
  res.json({ repositories });
});

router.get('/:id', authenticateToken, async (req, res) => {
  const result = await repoDb.getById(req.params.id, req.user.user_id);

  if (!result) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  res.json(result);
});

router.post('/:id/connect', authenticateToken, async (req, res) => {
  const repository = await repoDb.connect(req.params.id, req.user.user_id);

  if (!repository) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  res.json({ repository, connected: true });
});

router.post('/:id/disconnect', authenticateToken, async (req, res) => {
  const repository = await repoDb.disconnect(req.params.id, req.user.user_id);

  if (!repository) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  res.json({ repository, connected: false });
});

router.post('/:id/reprofile', authenticateToken, async (req, res) => {
  const repository = await repoDb.queueManualReprofile(req.params.id, req.user.user_id);

  if (!repository) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  res.json({ repository, queued: true });
});

router.patch('/:id/baseline', authenticateToken, async (req, res) => {
  const { enabled = true } = req.body;
  const repository = await repoDb.updateBaseline(req.params.id, req.user.user_id, enabled);

  if (!repository) {
    return res.status(404).json({ error: 'Repository not found' });
  }

  res.json({ repository });
});

module.exports = router;
