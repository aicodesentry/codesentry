const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const { DEFAULT_SEVERITY_COUNTS } = require('../constants/defaults');
const analysisDb = require('../db/analysisRuns');

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

    const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:8001';

    try {
      const findingsResponse = await axios.get(
        `${ANALYSIS_SERVICE_URL}/api/analysis/pr/${analysis.pr_number}`,
        { params: { repository: analysis.repository_name } }
      );

      analysis.findings = findingsResponse.data.findings || findingsResponse.data.vulnerabilities || [];
      analysis.severity_counts = findingsResponse.data.severity_counts || DEFAULT_SEVERITY_COUNTS;
      analysis.total_findings = findingsResponse.data.total_findings || findingsResponse.data.total_vulnerabilities || analysis.findings.length;
      analysis.files_analyzed = findingsResponse.data.files_analyzed || 0;
    } catch (mongoError) {
      analysis.findings = [];
      analysis.severity_counts = DEFAULT_SEVERITY_COUNTS;
      analysis.total_findings = 0;
      analysis.finding_fetch_error = `Could not retrieve finding details: ${mongoError.message}`;
    }

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

module.exports = router;
