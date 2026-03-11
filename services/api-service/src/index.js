require('dotenv').config();

const { pool } = require('./config/database');
const { initQueue, redisConnection } = require('./config/queue');
const logger = require('./utils/logger');
const { createApp } = require('./app');

const requiredEnvVars = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'GITHUB_WEBHOOK_SECRET'];
const missing = requiredEnvVars.filter((v) => !process.env[v]);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const PORT = Number(process.env.PORT || 3000);

async function start() {
  await initQueue();
  const redis = redisConnection();
  await redis.ping();

  const app = createApp();
  const server = app.listen(PORT, () => {
    logger.info('API service started', { port: PORT });
  });

  const shutdown = async () => {
    logger.info('API service shutting down');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.error('Failed to start API service', { error: err.message });
  process.exit(1);
});
