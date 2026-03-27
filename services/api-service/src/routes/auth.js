const express = require('express');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const router = express.Router();

router.use((_req, res, next) => {
  // Auth responses should never be cached by browsers/CDNs.
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const DEFAULT_GITHUB_APP_SLUG = 'aicodesentry';

function resolveGithubAppSlug() {
  const raw = (process.env.GITHUB_APP_SLUG || '').trim();
  const lowered = raw.toLowerCase();

  if (
    !raw ||
    lowered.includes('replace_me') ||
    lowered.includes('your_') ||
    lowered === 'github_app_slug'
  ) {
    return DEFAULT_GITHUB_APP_SLUG;
  }

  // Support passing the full GitHub App URL as env value.
  const match = raw.match(/github\.com\/apps\/([^/]+)/i);
  if (match?.[1]) return match[1];

  return raw;
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

  const callbackUrl =
    process.env.GITHUB_CALLBACK_URL || `${protocol}://${req.get('host')}/auth/github/callback`;

  const authUrl =
    `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}` +
    `&scope=read:user,user:email,read:org` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}`;

  res.redirect(authUrl);
});

router.get('/github/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${FRONTEND_URL}/?error=no_oauth_code`);
  }

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
      const emailsResp = await axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${githubToken}` },
        timeout: 20000,
      });
      email = emailsResp.data.find((entry) => entry.primary)?.email || emailsResp.data[0]?.email || null;
    }

    const upsert = await pool.query(
      `INSERT INTO users (github_id, github_username, github_email, avatar_url, name, github_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (github_id)
       DO UPDATE SET
         github_username = EXCLUDED.github_username,
         github_email = EXCLUDED.github_email,
         avatar_url = EXCLUDED.avatar_url,
         name = EXCLUDED.name,
         github_token = EXCLUDED.github_token,
         updated_at = NOW()
       RETURNING id, github_id, github_username, github_email, avatar_url, name`,
      [ghUser.data.id, ghUser.data.login, email, ghUser.data.avatar_url, ghUser.data.name, githubToken]
    );

    const user = upsert.rows[0];
    const token = jwt.sign(
      {
        user_id: user.id,
        github_id: user.github_id,
        github_username: user.github_username,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.redirect(`${FRONTEND_URL}/dashboard?token=${encodeURIComponent(token)}`);
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

router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userResult = await pool.query(
      `SELECT id, github_id, github_username, github_email, avatar_url, name, created_at
       FROM users
       WHERE id = $1`,
      [decoded.user_id]
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
  res.json({ success: true });
});

module.exports = router;
