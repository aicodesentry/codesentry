const grpc = require('@grpc/grpc-js');
const http = require('http');

const tokenCache = new Map();

function normalizeGrpcTarget(rawTarget, fallbackTarget) {
  const value = rawTarget || fallbackTarget;
  if (!value) {
    return '';
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    const url = new URL(value);
    return url.port ? url.host : `${url.hostname}:443`;
  }

  if (process.env.GRPC_TRANSPORT_TLS === 'true' && !value.includes(':')) {
    return `${value}:443`;
  }

  return value;
}

function normalizeAudience(rawAudience, rawTarget) {
  if (rawAudience) {
    return rawAudience.replace(/\/+$/, '');
  }
  if (rawTarget && rawTarget.startsWith('https://')) {
    return rawTarget.replace(/\/+$/, '');
  }
  return '';
}

function shouldUseTls(rawTarget, target) {
  return (
    process.env.GRPC_TRANSPORT_TLS === 'true' ||
    (rawTarget || '').startsWith('https://') ||
    target.endsWith(':443')
  );
}

function decodeJwtExpiry(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return Number(payload.exp || 0) * 1000;
  } catch (_error) {
    return Date.now() + 45 * 60 * 1000;
  }
}

function fetchMetadataIdentityToken(audience) {
  const path = `/computeMetadata/v1/instance/service-accounts/default/identity?audience=${encodeURIComponent(audience)}`;

  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: 'metadata.google.internal',
        path,
        headers: { 'Metadata-Flavor': 'Google' },
        timeout: 3000,
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(body);
            return;
          }
          reject(new Error(`Metadata token request failed with ${response.statusCode}`));
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(new Error('Metadata token request timed out'));
    });
    request.on('error', reject);
    request.end();
  });
}

async function getIdentityToken(audience) {
  const cached = tokenCache.get(audience);
  if (cached && cached.expiresAt - 60_000 > Date.now()) {
    return cached.token;
  }

  const token = await fetchMetadataIdentityToken(audience);
  tokenCache.set(audience, {
    token,
    expiresAt: decodeJwtExpiry(token),
  });
  return token;
}

function createCloudRunCallCredentials(audience) {
  return grpc.credentials.createFromMetadataGenerator(async (_params, callback) => {
    try {
      const token = await getIdentityToken(audience);
      const metadata = new grpc.Metadata();
      metadata.set('x-serverless-authorization', `Bearer ${token}`);
      callback(null, metadata);
    } catch (error) {
      callback(error);
    }
  });
}

function createChannelCredentials({ rawTarget, target, audience }) {
  if (!shouldUseTls(rawTarget, target)) {
    return grpc.credentials.createInsecure();
  }

  const sslCredentials = grpc.credentials.createSsl();
  if (!audience) {
    return sslCredentials;
  }

  return grpc.credentials.combineChannelCredentials(
    sslCredentials,
    createCloudRunCallCredentials(audience)
  );
}

function createGrpcClientConfig({ target, fallbackTarget, audience }) {
  const normalizedTarget = normalizeGrpcTarget(target, fallbackTarget);
  const normalizedAudience = normalizeAudience(audience, target);
  return {
    target: normalizedTarget,
    credentials: createChannelCredentials({
      rawTarget: target,
      target: normalizedTarget,
      audience: normalizedAudience,
    }),
  };
}

module.exports = {
  createGrpcClientConfig,
  normalizeAudience,
  normalizeGrpcTarget,
};
