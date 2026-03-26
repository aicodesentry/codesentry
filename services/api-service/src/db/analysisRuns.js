const { pool } = require('../config/database');

function isSchemaMismatch(error) {
  return error?.code === '42P01' || error?.code === '42703';
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

async function querySummary(userId) {
  try {
    return await querySummaryFromRuns(userId);
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
    return querySummaryLegacy(userId);
  }
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

async function listAnalyses(userId, { repositoryId, status, limit, offset }) {
  try {
    return await queryAnalysesFromRuns(userId, { repositoryId, status, limit, offset });
  } catch (error) {
    if (!isSchemaMismatch(error)) throw error;
    return queryAnalysesLegacy(userId, { repositoryId, status, limit, offset });
  }
}

async function getAnalysisById(analysisId, userId) {
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
      [analysisId, userId]
    );
    return runResult.rows[0] || null;
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
        [analysisId, userId]
      );
      return legacyOwnerResult.rows[0] || null;
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
        [analysisId, userId]
      );
      return legacyUserResult.rows[0] || null;
    }
  }
}

module.exports = { querySummary, listAnalyses, getAnalysisById };
