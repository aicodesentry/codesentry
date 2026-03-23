const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const client = require('prom-client');
const { v4: uuidv4 } = require('uuid');

const authRoutes = require('./routes/auth');
const installationRoutes = require('./routes/installations');
const repositoryRoutes = require('./routes/repositories');
const prRoutes = require('./routes/prs');
const findingRoutes = require('./routes/findings');
const suppressionRoutes = require('./routes/suppressions');
const reportsRoutes = require('./routes/reports');
const webhookRoutes = require('./routes/webhooks');
const healthRoutes = require('./routes/health');
const logger = require('./utils/logger');

function createApp() {
  const app = express();
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.set('trust proxy', 1);

  const metricsRegister = new client.Registry();
  client.collectDefaultMetrics({ register: metricsRegister });

  const httpDuration = new client.Histogram({
    name: 'codesentry_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [metricsRegister],
  });

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
    })
  );

  const CORS_ORIGINS = [
    FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3001',
    ...(process.env.FIREBASE_HOSTING_URL ? [process.env.FIREBASE_HOSTING_URL] : []),
  ].filter(Boolean);

  app.use(
    cors({
      origin(origin, callback) {
        // Allow requests with no origin (server-to-server, curl, etc.)
        if (!origin) return callback(null, true);
        if (
          CORS_ORIGINS.includes(origin) ||
          origin.endsWith('.web.app') && origin.includes('codesentry')
        ) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    })
  );

  app.use((req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  });

  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      const route = req.route?.path || req.path || 'unknown';
      httpDuration.labels(req.method, route, String(res.statusCode)).observe(durationSeconds);
    });
    next();
  });

  app.use('/webhooks', express.raw({ type: 'application/json', limit: '10mb' }));
  app.use('/webhooks', webhookRoutes);

  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.use(
    '/api',
    rateLimit({
      windowMs: 10 * 60 * 1000,
      max: 400,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.use('/auth', authRoutes);
  app.use('/api/installations', installationRoutes);
  app.use('/api/repositories', repositoryRoutes);
  app.use('/api', prRoutes);
  app.use('/api', findingRoutes);
  app.use('/api', suppressionRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/health', healthRoutes);

  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', metricsRegister.contentType);
    res.end(await metricsRegister.metrics());
  });

  app.get('/', (_req, res) => {
    res.json({ service: 'codesentry-api', status: 'ok', version: '1.0.0' });
  });

  app.use((err, req, res, _next) => {
    logger.error('Unhandled API error', {
      correlationId: req.correlationId,
      error: err.message,
      stack: err.stack,
    });
    res.status(err.status || 500).json({ error: err.message || 'Internal error' });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}

module.exports = { createApp };
