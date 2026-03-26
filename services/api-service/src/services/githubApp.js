const crypto = require('crypto');
const axios = require('axios');

function normalizePrivateKey(rawKey) {
  if (!rawKey) return null;
  let key = rawKey;
  if (!key.includes('BEGIN')) {
    try {
      key = Buffer.from(rawKey, 'base64').toString('utf8');
    } catch (decodeErr) {
      // base64 decode failed, use raw value
      key = rawKey;
    }
  }
  return key.replace(/\\n/g, '\n');
}

function createAppJwt() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = normalizePrivateKey(process.env.GITHUB_APP_PRIVATE_KEY);

  if (!appId || !privateKey) {
    throw new Error('Missing GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iat: now - 60, exp: now + 9 * 60, iss: appId };

  const base64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const signingInput = `${base64url(header)}.${base64url(payload)}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(privateKey, 'base64url');

  return `${signingInput}.${signature}`;
}

async function getInstallationToken(installationId) {
  const jwt = createAppJwt();

  const response = await axios.post(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {},
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
      },
      timeout: 20000,
    }
  );

  return response.data.token;
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('GITHUB_WEBHOOK_SECRET is required');
  }

  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')}`;

  const sigBuffer = Buffer.from(signatureHeader);
  const expBuffer = Buffer.from(expected);

  if (sigBuffer.length !== expBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, expBuffer);
}

module.exports = {
  getInstallationToken,
  verifyWebhookSignature,
  createAppJwt,
};
