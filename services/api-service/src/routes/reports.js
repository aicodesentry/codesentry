const express = require('express');
const { pool } = require('../config/database');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const { DEFAULT_SEVERITY_COUNTS, DEFAULT_STYLE_CATEGORIES } = require('../constants/defaults');

const router = express.Router();

function isSchemaMismatch(error) {
  return error?.code === '42P01' || error?.code === '42703';
}

async function queryAnalysesFromRuns(userId, { repositoryId, status, limit, offset }) {
  const params = [userId];
  const where = ['r.owner_id = $1'];

  if (repositoryId) {
    where.push(`r.id = $${params.length + 1}`);
    params.push(repositoryId);
  }

  if (status) {
    where.push(`ar.status = $${params.length + 1}`);
    params.push(status);
  }

  const listQuery = `
    SELECT
      ar.id,
      ar.pr_number,
      pr.html_url AS pr_url,
      ar.status,
      ar.started_at,
      ar.completed_at,
      EXTRACT(EPOCH FROM (ar.completed_at - ar.started_at)) AS processing_time_seconds,
      r.id AS repository_id,
      r.full_name AS repository_name,
      r.name AS repo_short_name
    FROM analysis_runs ar
    JOIN repositories r ON ar.repository_id = r.id
    LEFT JOIN pull_requests pr ON pr.id = ar.pull_request_id
    WHERE ${where.join(' AND ')}
    ORDER BY COALESCE(ar.started_at, ar.created_at) DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM analysis_runs ar
    JOIN repositories r ON ar.repository_id = r.id
    WHERE ${where.join(' AND ')}
  `;

  const list = await pool.query(listQuery, [...params, limit, offset]);
  const count = await pool.query(countQuery, params);
  return { rows: list.rows, total: parseInt(count.rows[0].total, 10) };
}

async function queryAnalysesLegacy(userId, { repositoryId, status, limit, offset }) {
  const tryOwnerScoped = async () => {
    const params = [userId];
    const where = ['r.owner_id = $1'];

    if (repositoryId) {
      where.push(`r.id = $${params.length + 1}`);
      params.push(repositoryId);
    }
    if (status) {
      where.push(`a.status = $${params.length + 1}`);
      params.push(status);
    }

    const list = await pool.query(
      `SELECT
         a.id,
         a.pr_number,
         a.pr_url,
         a.status,
         a.started_at,
         a.completed_at,
         EXTRACT(EPOCH FROM (a.completed_at - a.started_at)) AS processing_time_seconds,
         r.id AS repository_id,
         r.full_name AS repository_name,
         r.name AS repo_short_name
       FROM analysis a
       JOIN repositories r ON a.repository_id = r.id
       WHERE ${where.join(' AND ')}
       ORDER BY a.started_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const count = await pool.query(
      `SELECT COUNT(*) AS total
       FROM analysis a
       JOIN repositories r ON a.repository_id = r.id
       WHERE ${where.join(' AND ')}`,
      params
    );
    return { rows: list.rows, total: parseInt(count.rows[0].total, 10) };
  };

  const tryUserScoped = async () => {
    const params = [userId];
    const where = ['r.user_id = $1'];

    if (repositoryId) {
      where.push(`r.id = $${params.length + 1}`);
      params.push(repositoryId);
    }
    if (status) {
      where.push(`a.status = $${params.length + 1}`);
      params.push(status);
    }

    const list = await pool.query(
      `SELECT
         a.id,
         a.pr_number,
         a.pr_url,
         a.status,
         a.started_at,
         a.completed_at,
         EXTRACT(EPOCH FROM (a.completed_at - a.started_at)) AS processing_time_seconds,
         r.id AS repository_id,
         r.full_name AS repository_name,
         r.name AS repo_short_name
       FROM analysis a
       JOIN repositories r ON a.repository_id = r.id
       WHERE ${where.join(' AND ')}
       ORDER BY a.started_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const count = await pool.query(
      `SELECT COUNT(*) AS total
       FROM analysis a
       JOIN repositories r ON a.repository_id = r.id
       WHERE ${where.join(' AND ')}`,
      params
    );
    return { rows: list.rows, total: parseInt(count.rows[0].total, 10) };
  };

  try {
    return await tryOwnerScoped();
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
    return tryUserScoped();
  }
}

async function querySummaryFromRuns(userId) {
  const result = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE ar.status = 'completed') AS completed,
       COUNT(*) FILTER (WHERE ar.status = 'failed') AS failed,
       COUNT(*) FILTER (WHERE COALESCE(ar.started_at, ar.created_at) >= NOW() - INTERVAL '7 days') AS recent
     FROM analysis_runs ar
     JOIN repositories r ON ar.repository_id = r.id
     WHERE r.owner_id = $1`,
    [userId]
  );
  return result.rows[0];
}

async function querySummaryLegacy(userId) {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE a.status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE a.status = 'failed') AS failed,
         COUNT(*) FILTER (WHERE a.started_at >= NOW() - INTERVAL '7 days') AS recent
       FROM analysis a
       JOIN repositories r ON a.repository_id = r.id
       WHERE r.owner_id = $1`,
      [userId]
    );
    return result.rows[0];
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
    const fallback = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE a.status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE a.status = 'failed') AS failed,
         COUNT(*) FILTER (WHERE a.started_at >= NOW() - INTERVAL '7 days') AS recent
       FROM analysis a
       JOIN repositories r ON a.repository_id = r.id
       WHERE r.user_id = $1`,
      [userId]
    );
    return fallback.rows[0];
  }
}

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

    let data;
    try {
      data = await queryAnalysesFromRuns(req.user.user_id, pagination);
    } catch (error) {
      if (!isSchemaMismatch(error)) throw error;
      data = await queryAnalysesLegacy(req.user.user_id, pagination);
    }

    res.json({
      success: true,
      analyses: data.rows,
      total: data.total,
      limit: pagination.limit,
      offset: pagination.offset,
    });
  } catch (error) {
    console.error('Error fetching PR analyses:', error);
    res.status(500).json({ error: 'Failed to fetch PR analyses', details: error.message });
  }
});

router.get('/pr-analyses/:analysisId', authenticateToken, async (req, res) => {
  try {
    const { analysisId } = req.params;
    let analysis;

    try {
      const runResult = await pool.query(
        `SELECT
           ar.id,
           ar.pr_number,
           pr.html_url AS pr_url,
           ar.status,
           ar.started_at,
           ar.completed_at,
           EXTRACT(EPOCH FROM (ar.completed_at - ar.started_at)) AS processing_time_seconds,
           r.id AS repository_id,
           r.full_name AS repository_name,
           r.github_id AS repository_github_id
         FROM analysis_runs ar
         JOIN repositories r ON ar.repository_id = r.id
         LEFT JOIN pull_requests pr ON pr.id = ar.pull_request_id
         WHERE ar.id = $1 AND r.owner_id = $2`,
        [analysisId, req.user.user_id]
      );
      analysis = runResult.rows[0];
    } catch (error) {
      if (!isSchemaMismatch(error)) throw error;
      try {
        const legacyOwnerResult = await pool.query(
          `SELECT
             a.id,
             a.pr_number,
             a.pr_url,
             a.status,
             a.started_at,
             a.completed_at,
             EXTRACT(EPOCH FROM (a.completed_at - a.started_at)) AS processing_time_seconds,
             r.id AS repository_id,
             r.full_name AS repository_name,
             r.github_id AS repository_github_id
           FROM analysis a
           JOIN repositories r ON a.repository_id = r.id
           WHERE a.id = $1 AND r.owner_id = $2`,
          [analysisId, req.user.user_id]
        );
        analysis = legacyOwnerResult.rows[0];
      } catch (legacyOwnerError) {
        if (!isSchemaMismatch(legacyOwnerError)) throw legacyOwnerError;
        const legacyUserResult = await pool.query(
          `SELECT
             a.id,
             a.pr_number,
             a.pr_url,
             a.status,
             a.started_at,
             a.completed_at,
             EXTRACT(EPOCH FROM (a.completed_at - a.started_at)) AS processing_time_seconds,
             r.id AS repository_id,
             r.full_name AS repository_name,
             r.github_id AS repository_github_id
           FROM analysis a
           JOIN repositories r ON a.repository_id = r.id
           WHERE a.id = $1 AND r.user_id = $2`,
          [analysisId, req.user.user_id]
        );
        analysis = legacyUserResult.rows[0];
      }
    }

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const ANALYSIS_SERVICE_URL = process.env.ANALYSIS_SERVICE_URL || 'http://analysis-service:8001';

    try {
      const vulnerabilitiesResponse = await axios.get(
        `${ANALYSIS_SERVICE_URL}/api/analysis/pr/${analysis.pr_number}`,
        { params: { repository: analysis.repository_name } }
      );

      analysis.vulnerabilities = vulnerabilitiesResponse.data.vulnerabilities || [];
      analysis.style_issues = vulnerabilitiesResponse.data.style_issues || [];
      analysis.severity_counts = vulnerabilitiesResponse.data.severity_counts || DEFAULT_SEVERITY_COUNTS;
      analysis.style_categories = vulnerabilitiesResponse.data.style_categories || DEFAULT_STYLE_CATEGORIES;
      analysis.total_vulnerabilities = vulnerabilitiesResponse.data.total_vulnerabilities || 0;
      analysis.total_style_issues = vulnerabilitiesResponse.data.total_style_issues || 0;
      analysis.files_analyzed = vulnerabilitiesResponse.data.files_analyzed || 0;
    } catch (mongoError) {
      analysis.vulnerabilities = [];
      analysis.style_issues = [];
      analysis.severity_counts = DEFAULT_SEVERITY_COUNTS;
      analysis.style_categories = DEFAULT_STYLE_CATEGORIES;
      analysis.total_vulnerabilities = 0;
      analysis.total_style_issues = 0;
      analysis.vulnerability_fetch_error = `Could not retrieve vulnerability details: ${mongoError.message}`;
    }

    res.json({ success: true, analysis });
  } catch (error) {
    console.error('Error fetching analysis details:', error);
    res.status(500).json({ error: 'Failed to fetch analysis details', details: error.message });
  }
});

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    let summary;
    try {
      summary = await querySummaryFromRuns(req.user.user_id);
    } catch (error) {
      if (!isSchemaMismatch(error)) throw error;
      summary = await querySummaryLegacy(req.user.user_id);
    }

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
    res.status(500).json({ error: 'Failed to fetch summary', details: error.message });
  }
});

module.exports = router;
