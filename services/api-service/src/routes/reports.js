const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const analysisDb = require('../db/analysisRuns');
const findingsDb = require('../db/findings');
const { triggerAnalysisJob } = require('../services/prAnalysisOrchestrator');

const router = express.Router();

router.get('/pr-analyses', authenticateToken, async (req, res) => {
  try {
    const { repository_id, status, limit = 50, offset = 0 } = req.query;

    if (repository_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(repository_id)) {
        return res.status(400).json({
          error: 'Invalid repository ID format',
          details: 'Repository ID must be a valid UUID',
        });
      }
    }

    const pagination = {
      repositoryId: repository_id,
      status,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    };

    const data = await analysisDb.listAnalyses(req.user.user_id, pagination);

    res.json({
      success: true,
      analyses: data.rows,
      total: data.total,
      limit: pagination.limit,
      offset: pagination.offset,
    });
  } catch (error) {
    console.error('Error fetching PR analyses:', error);
    res.status(500).json({ error: 'Failed to fetch PR analyses' });
  }
});

router.get('/pr-analyses/:analysisId', authenticateToken, async (req, res) => {
  try {
    const { analysisId } = req.params;

    const analysis = await analysisDb.getAnalysisById(analysisId, req.user.user_id);

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const findings = await findingsDb.listByAnalysisRun(analysisId);
    analysis.findings = findings;
    analysis.total_findings = findings.length;
    analysis.severity_counts = findings.reduce((acc, f) => {
      const s = f.severity || 'low';
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, { critical: 0, high: 0, medium: 0, low: 0 });

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Error fetching analysis details:', error);
    res.status(500).json({ error: 'Failed to fetch analysis details' });
  }
});

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await analysisDb.querySummary(req.user.user_id);

    res.json({
      success: true,
      summary: {
        total_analyses: parseInt(summary.total, 10),
        completed: parseInt(summary.completed, 10),
        failed: parseInt(summary.failed, 10),
        recent_7_days: parseInt(summary.recent, 10),
      },
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

router.post('/pr-analyses/:analysisId/retry', authenticateToken, async (req, res) => {
  try {
    const { analysisId } = req.params;
    const analysis = await analysisDb.getAnalysisById(analysisId, req.user.user_id);

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }
    if (analysis.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed analyses can be retried' });
    }

    const runData = await pool.query(
      `SELECT ar.*, r.full_name AS repository_full_name, r.installation_id, r.baseline_set
       FROM analysis_runs ar
       JOIN repositories r ON r.id = ar.repository_id
       WHERE ar.id = $1`,
      [analysisId]
    );
    const run = runData.rows[0];
    if (!run) {
      return res.status(404).json({ error: 'Analysis run not found' });
    }

    await pool.query(
      `UPDATE analysis_runs SET status = 'pending', error_message = NULL, started_at = NOW() WHERE id = $1`,
      [analysisId]
    );

    triggerAnalysisJob({
      analysis_run_id: run.id,
      repository_id: run.repository_id,
      repository_full_name: run.repository_full_name,
      installation_id: run.installation_id,
      pull_request_id: run.pull_request_id,
      pull_request_number: run.pr_number,
      commit_sha: run.commit_sha,
      baseline_set: run.baseline_set,
    });

    res.json({ success: true, message: 'Analysis retry triggered' });
  } catch (error) {
    console.error('Error retrying analysis:', error);
    res.status(500).json({ error: 'Failed to retry analysis' });
  }
});

module.exports = router;
