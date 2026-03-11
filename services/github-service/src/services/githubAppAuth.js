const axios = require('axios');
const crypto = require('crypto');

// Normalize private key to PEM (handles \n escaped strings and optional base64)
function normalizePrivateKey(rawKey) {
  if (!rawKey) return null;
  let key = rawKey;
  if (!key.includes('BEGIN')) {
    try {
      key = Buffer.from(rawKey, 'base64').toString('utf8');
    } catch (err) {
      // fall through and use rawKey
      key = rawKey;
    }
  }
  return key.replace(/\\n/g, '\n');
}

function buildAppJWT(appId, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60, // backdate to allow minor clock skew
    exp: now + 9 * 60, // GitHub allows up to 10 minutes
    iss: appId,
  };

  const header = { alg: 'RS256', typ: 'JWT' };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${encode(header)}.${encode(payload)}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(privateKey, 'base64url');

  return `${signingInput}.${signature}`;
}

async function getInstallationToken() {
  const appId = process.env.GITHUB_APP_ID;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
  const rawKey = process.env.GITHUB_APP_PRIVATE_KEY;

  const privateKey = normalizePrivateKey(rawKey);

  if (!appId || !installationId || !privateKey) {
    throw new Error('GitHub App env vars missing (GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, GITHUB_APP_PRIVATE_KEY)');
  }

  const jwt = buildAppJWT(appId, privateKey);

  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;

  try {
    const response = await axios.post(
      url,
      {},
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    return response.data.token;
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data;
    const detail = body ? JSON.stringify(body) : err.message;
    throw new Error(`GitHub App token request failed (status ${status || 'unknown'}): ${detail}`);
  }
}

function isConfigured() {
  return Boolean(
    process.env.GITHUB_APP_ID &&
    process.env.GITHUB_APP_INSTALLATION_ID &&
    process.env.GITHUB_APP_PRIVATE_KEY
  );
}

async function healthCheck() {
  if (!isConfigured()) {
    return { ok: false, error: 'Missing GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, or GITHUB_APP_PRIVATE_KEY' };
  }

  return { ok: true };
}

module.exports = {
  getInstallationToken,
  isConfigured,
  healthCheck,
};
