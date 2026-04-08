const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { encrypt } = require('../utils/encryption');
const { persistGithubTokens } = require('../services/githubUserAuth');

const router = express.Router();

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const DEFAULT_GITHUB_APP_SLUG = 'mitig8it';

// In-memory store for OAuth state (short-lived)
const pendingStates = new Map();
const AUTH_COOKIE_NAME = '__session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Clean expired entries every 5 minutes without keeping the process alive.
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingStates) {
    if (now - val.created > 10 * 60 * 1000) pendingStates.delete(key);
  }
}, 5 * 60 * 1000);

if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

function resolveGithubAppSlug() {
  const raw = (process.env.GITHUB_APP_SLUG || '').trim();
  const lowered = raw.toLowerCase();

  if (!raw || lowered.includes('replace_me') || lowered.includes('your_') || lowered === 'github_app_slug') {
    return DEFAULT_GITHUB_APP_SLUG;
  }

  const match = raw.match(/github\.com\/apps\/([^/]+)/i);
  if (match?.[1]) return match[1];

  return raw;
}

function cookieOptions(req) {
  const isProduction = process.env.NODE_ENV === 'production';
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto ? forwardedProto.split(',')[0] : req.protocol;
  const secure = isProduction || protocol === 'https';

  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/',
  };
}

function publicBaseUrl(req) {
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto ? forwardedProto.split(',')[0] : req.protocol;
  return process.env.FRONTEND_URL || `${protocol}://${req.get('host')}`;
}

router.get('/github', (req, res) => {
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    return res.status(500).json({ error: 'GitHub OAuth is not configured' });
  }

  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = forwardedProto ? forwardedProto.split(',')[0] : req.protocol;

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && protocol !== 'https') {
    return res.status(400).json({ error: 'HTTPS required' });
  }

  // Generate CSRF state parameter
  const state = crypto.randomBytes(20).toString('hex');
  pendingStates.set(state, { created: Date.now() });

  const callbackUrl =
    process.env.GITHUB_CALLBACK_URL || `${publicBaseUrl(req)}/auth/github/callback`;

  const authUrl =
    `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}` +
    `&scope=read:user,user:email` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    `&state=${state}`;

  res.redirect(authUrl);
});

router.get('/github/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code) {
    return res.redirect(`${FRONTEND_URL}/?error=no_oauth_code`);
  }

  // Validate state parameter (CSRF protection)
  if (!state || !pendingStates.has(state)) {
    return res.redirect(`${FRONTEND_URL}/?error=invalid_state`);
  }
  pendingStates.delete(state);

  try {
    const tokenResp = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' }, timeout: 20000 }
    );

    const githubToken = tokenResp.data.access_token;
    if (!githubToken) {
      return res.redirect(`${FRONTEND_URL}/?error=oauth_exchange_failed`);
    }

    const ghUser = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${githubToken}` },
      timeout: 20000,
    });

    let email = ghUser.data.email || null;
    if (!email) {
      try {
        const emailsResp = await axios.get('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${githubToken}` },
          timeout: 20000,
        });
        email = emailsResp.data.find((entry) => entry.primary)?.email || emailsResp.data[0]?.email || null;
      } catch (emailErr) {
        console.warn(JSON.stringify({
          level: 'warn',
          msg: 'Could not fetch user email',
          status: emailErr.response?.status,
          github_username: ghUser.data.login,
        }));
        email = `${ghUser.data.id}+${ghUser.data.login}@users.noreply.github.com`;
      }
    }

    const encryptedGithubToken = encrypt(githubToken);
    const encryptedRefreshToken = tokenResp.data.refresh_token ? encrypt(tokenResp.data.refresh_token) : null;
    const githubTokenExpiresAt = tokenResp.data.expires_in
      ? new Date(Date.now() + Number(tokenResp.data.expires_in) * 1000)
      : null;
    const githubRefreshTokenExpiresAt = tokenResp.data.refresh_token_expires_in
      ? new Date(Date.now() + Number(tokenResp.data.refresh_token_expires_in) * 1000)
      : null;

    const upsert = await pool.query(
      `INSERT INTO users (
         github_id, github_username, github_email, avatar_url, name, github_token,
         github_refresh_token, github_token_expires_at, github_refresh_token_expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (github_id)
       DO UPDATE SET
         github_username = EXCLUDED.github_username,
         github_email = EXCLUDED.github_email,
         avatar_url = EXCLUDED.avatar_url,
         name = EXCLUDED.name,
         github_token = EXCLUDED.github_token,
         github_refresh_token = EXCLUDED.github_refresh_token,
         github_token_expires_at = EXCLUDED.github_token_expires_at,
         github_refresh_token_expires_at = EXCLUDED.github_refresh_token_expires_at,
         updated_at = NOW()
       RETURNING id, github_id, github_username, github_email, avatar_url, name`,
      [
        ghUser.data.id,
        ghUser.data.login,
        email,
        ghUser.data.avatar_url,
        ghUser.data.name,
        encryptedGithubToken,
        encryptedRefreshToken,
        githubTokenExpiresAt,
        githubRefreshTokenExpiresAt,
      ]
    );

    const user = upsert.rows[0];
    if (tokenResp.data.refresh_token || tokenResp.data.expires_in || tokenResp.data.refresh_token_expires_in) {
      await persistGithubTokens(user.id, tokenResp.data);
    }
    const jwtToken = jwt.sign(
      { user_id: user.id, github_id: user.github_id, github_username: user.github_username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie(AUTH_COOKIE_NAME, jwtToken, cookieOptions(req));
    res.redirect(`${publicBaseUrl(req)}/dashboard`);
  } catch (error) {
    const detail = error.response?.data || error.message;
    const status = error.response?.status;
    console.error(JSON.stringify({
      level: 'error',
      msg: 'OAuth callback failed',
      step: error._step || 'unknown',
      status,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
    }));
    res.redirect(`${FRONTEND_URL}/?error=oauth_callback_failed`);
  }
});

// Legacy compatibility endpoint from the short-lived auth-code flow.
router.post('/exchange', (req, res) => {
  return res.status(410).json({
    error: 'Legacy auth exchange is no longer supported. Restart sign-in from /auth/github.',
  });
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT id, github_id, github_username, github_email, avatar_url, name, created_at
       FROM users WHERE id = $1`,
      [req.user.user_id]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const appSlug = resolveGithubAppSlug();
    const installUrl = appSlug ? `https://github.com/apps/${appSlug}/installations/new` : null;

    return res.json({ user, github_app_install_url: installUrl });
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
  res.json({ success: true });
});

module.exports = router;
