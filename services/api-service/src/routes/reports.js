const express = require('express');
const { pool } = require('../config/database');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const { DEFAULT_SEVERITY_COUNTS, DEFAULT_STYLE_CATEGORIES } = require('../constants/defaults');

const router = express.Router();

// Get all PR analysis reports
router.get('/pr-analyses', authenticateToken, async (req, res) => {
  try {
    const { repository_id, status, limit = 50, offset = 0 } = req.query;

    // Validate repository_id is a valid UUID format if provided
    if (repository_id) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(repository_id)) {
        return res.status(400).json({
          error: 'Invalid repository ID format',
          details: 'Repository ID must be a valid UUID'
        });
      }
    }

    // Build dynamic query — always scoped to authenticated user
    const conditions = [];
    const queryParams = [];

    conditions.push(`r.user_id = $${queryParams.length + 1}`);
    queryParams.push(req.user.user_id);

    if (repository_id) {
      conditions.push(`r.id = $${queryParams.length + 1}`);
      queryParams.push(repository_id);
    }

    if (status) {
      conditions.push(`a.status = $${queryParams.length + 1}`);
      queryParams.push(status);
    }

    let query = `
      SELECT
        a.id,
        a.pr_number,
        a.pr_url,
        a.status,
        a.started_at,
        a.completed_at,
        EXTRACT(EPOCH FROM (a.completed_at - a.started_at)) as processing_time_seconds,
        r.id as repository_id,
        r.full_name as repository_name,
        r.name as repo_short_name
      FROM analysis a
      JOIN repositories r ON a.repository_id = r.id
    `;

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY a.started_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, queryParams);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM analysis a
      JOIN repositories r ON a.repository_id = r.id
    `;
    const countParams = [];
    const countConditions = [];

    countConditions.push(`r.user_id = $${countParams.length + 1}`);
    countParams.push(req.user.user_id);

    if (repository_id) {
      countConditions.push(`r.id = $${countParams.length + 1}`);
      countParams.push(repository_id);
    }

    if (status) {
      countConditions.push(`a.status = $${countParams.length + 1}`);
      countParams.push(status);
    }

    countQuery += ` WHERE ${countConditions.join(' AND ')}`;

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      success: true,
      analyses: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching PR analyses:', error);
    res.status(500).json({
      error: 'Failed to fetch PR analyses',
      details: error.message
    });
  }
});

// Get detailed analysis for a specific PR (including vulnerabilities from MongoDB)
router.get('/pr-analyses/:analysisId', authenticateToken, async (req, res) => {
  try {
    const { analysisId } = req.params;

    const conditions = ['a.id = $1', 'r.user_id = $2'];
    const params = [analysisId, req.user.user_id];

    // Get analysis record from PostgreSQL
    const analysisResult = await pool.query(
      `SELECT
        a.id,
        a.pr_number,
        a.pr_url,
        a.status,
        a.started_at,
        a.completed_at,
        EXTRACT(EPOCH FROM (a.completed_at - a.started_at)) as processing_time_seconds,
        r.id as repository_id,
        r.full_name as repository_name,
        r.github_id as repository_github_id
      FROM analysis a
      JOIN repositories r ON a.repository_id = r.id
      WHERE ${conditions.join(' AND ')}`,
      params
    );

    if (analysisResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const analysis = analysisResult.rows[0];

    // Get vulnerability details from analysis-service (MongoDB)
    const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:8001';

    try {
      const vulnerabilitiesResponse = await axios.get(
        `${ANALYSIS_SERVICE_URL}/api/analysis/pr/${analysis.pr_number}`,
        {
          params: {
            repository: analysis.repository_name
          }
        }
      );

      analysis.vulnerabilities = vulnerabilitiesResponse.data.vulnerabilities || [];
      analysis.style_issues = vulnerabilitiesResponse.data.style_issues || [];
      analysis.severity_counts = vulnerabilitiesResponse.data.severity_counts || DEFAULT_SEVERITY_COUNTS;
      analysis.style_categories = vulnerabilitiesResponse.data.style_categories || DEFAULT_STYLE_CATEGORIES;
      analysis.total_vulnerabilities = vulnerabilitiesResponse.data.total_vulnerabilities || 0;
      analysis.total_style_issues = vulnerabilitiesResponse.data.total_style_issues || 0;
      analysis.files_analyzed = vulnerabilitiesResponse.data.files_analyzed || 0;
    } catch (mongoError) {
      console.error('Failed to fetch vulnerabilities from MongoDB:', mongoError.message);
      console.error('Request URL:', `${ANALYSIS_SERVICE_URL}/api/analysis/pr/${analysis.pr_number}?repository=${analysis.repository_name}`);
      console.error('Full error:', mongoError.response?.data || mongoError);
      // Return analysis without vulnerability details if MongoDB fetch fails
      analysis.vulnerabilities = [];
      analysis.style_issues = [];
      analysis.severity_counts = DEFAULT_SEVERITY_COUNTS;
      analysis.style_categories = DEFAULT_STYLE_CATEGORIES;
      analysis.total_vulnerabilities = 0;
      analysis.total_style_issues = 0;
      analysis.vulnerability_fetch_error = `Could not retrieve vulnerability details: ${mongoError.message}`;
    }

    res.json({
      success: true,
      analysis: analysis
    });
  } catch (error) {
    console.error('Error fetching analysis details:', error);
    res.status(500).json({
      error: 'Failed to fetch analysis details',
      details: error.message
    });
  }
});

// Get summary statistics for reports dashboard
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    // Get summary statistics scoped to the authenticated user only
    const params = [req.user.user_id];

    const summaryQuery = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE a.status = 'completed') as completed,
        COUNT(*) FILTER (WHERE a.status = 'failed') as failed,
        COUNT(*) FILTER (WHERE a.started_at >= NOW() - INTERVAL '7 days') as recent
       FROM analysis a
       JOIN repositories r ON a.repository_id = r.id
       WHERE r.user_id = $1
    `;

    const result = await pool.query(summaryQuery, params);

    const summary = result.rows[0];

    res.json({
      success: true,
      summary: {
        total_analyses: parseInt(summary.total),
        completed: parseInt(summary.completed),
        failed: parseInt(summary.failed),
        recent_7_days: parseInt(summary.recent)
      }
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      error: 'Failed to fetch summary',
      details: error.message
    });
  }
});

module.exports = router;
