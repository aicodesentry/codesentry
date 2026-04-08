const axios = require('axios');
const { pool } = require('../config/database');
const { decrypt, encrypt, isEncrypted } = require('../utils/encryption');

function decryptIfNeeded(value) {
  if (!value) return null;
  return isEncrypted(value) ? decrypt(value) : value;
}

function expiryFromSeconds(seconds) {
  const parsed = Number(seconds);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return new Date(Date.now() + parsed * 1000);
}

function isExpired(dateValue, leewayMs = 60 * 1000) {
  if (!dateValue) return false;
  const expiresAt = new Date(dateValue).getTime();
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt <= Date.now() + leewayMs;
}

async function loadUserGithubAuth(userId) {
  const result = await pool.query(
    `SELECT github_token, github_refresh_token, github_token_expires_at, github_refresh_token_expires_at, github_username
     FROM users
     WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

async function persistGithubTokens(userId, tokenData) {
  const accessToken = tokenData.access_token ? encrypt(tokenData.access_token) : null;
  const refreshToken = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null;
  const tokenExpiresAt = expiryFromSeconds(tokenData.expires_in);
  const refreshTokenExpiresAt = expiryFromSeconds(tokenData.refresh_token_expires_in);

  await pool.query(
    `UPDATE users
     SET github_token = COALESCE($2, github_token),
         github_refresh_token = COALESCE($3, github_refresh_token),
         github_token_expires_at = $4,
         github_refresh_token_expires_at = $5,
         updated_at = NOW()
     WHERE id = $1`,
    [userId, accessToken, refreshToken, tokenExpiresAt, refreshTokenExpiresAt]
  );

  return {
    accessToken: tokenData.access_token || null,
    refreshToken: tokenData.refresh_token || null,
    tokenExpiresAt,
    refreshTokenExpiresAt,
  };
}

async function exchangeRefreshToken(refreshToken) {
  const response = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    },
    {
      headers: { Accept: 'application/json' },
      timeout: 20000,
    }
  );

  return response.data;
}

async function refreshGithubAccessToken(userId, authRow) {
  const refreshToken = decryptIfNeeded(authRow?.github_refresh_token);
  if (!refreshToken) {
    const error = new Error('GitHub refresh token is not available');
    error.code = 'GITHUB_REFRESH_UNAVAILABLE';
    throw error;
  }

  if (isExpired(authRow.github_refresh_token_expires_at)) {
    const error = new Error('GitHub refresh token has expired');
    error.code = 'GITHUB_REFRESH_EXPIRED';
    throw error;
  }

  const tokenData = await exchangeRefreshToken(refreshToken);
  if (!tokenData.access_token) {
    const error = new Error('GitHub token refresh did not return an access token');
    error.code = 'GITHUB_REFRESH_FAILED';
    throw error;
  }

  const persisted = await persistGithubTokens(userId, tokenData);
  return {
    token: persisted.accessToken,
    githubUsername: authRow.github_username,
    refreshed: true,
  };
}

async function getGithubAccessTokenForUser(userId, { forceRefresh = false } = {}) {
  const authRow = await loadUserGithubAuth(userId);
  if (!authRow?.github_token) {
    const error = new Error('GitHub account is not connected');
    error.code = 'GITHUB_NOT_CONNECTED';
    throw error;
  }

  const accessToken = decryptIfNeeded(authRow.github_token);
  const shouldRefresh = forceRefresh || isExpired(authRow.github_token_expires_at);

  if (!shouldRefresh) {
    return {
      token: accessToken,
      githubUsername: authRow.github_username,
      refreshed: false,
    };
  }

  try {
    return await refreshGithubAccessToken(userId, authRow);
  } catch (error) {
    if (accessToken && !forceRefresh) {
      return {
        token: accessToken,
        githubUsername: authRow.github_username,
        refreshed: false,
        refreshFailed: true,
      };
    }
    throw error;
  }
}

module.exports = {
  getGithubAccessTokenForUser,
  persistGithubTokens,
  refreshGithubAccessToken,
};
