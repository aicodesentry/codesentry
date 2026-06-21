const crypto = require('crypto');
const express = require('express');
const analysisRunsDb = require('../db/analysisRuns');
const { notifyAnalysisQueued } = require('../services/prAnalysisOrchestrator');

const router = express.Router();

function ensureInternalAuth(req, res, next) {
  const expected = process.env.GITHUB_SERVICE_INTERNAL_SECRET;
  if (!expected) {
    return res.status(500).json({ error: 'Internal secret is not configured' });
  }

  const provided = req.get('x-internal-secret') || '';
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);

  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

router.use(ensureInternalAuth);

router.post('/analysis-queue/tick', async (_req, res, next) => {
  try {
    notifyAnalysisQueued();
    const queue = await analysisRunsDb.getQueueStats();
    res.json({ ok: true, queued: true, queue });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
