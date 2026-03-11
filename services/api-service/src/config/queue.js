const { Queue } = require('bullmq');
const IORedis = require('ioredis');
const logger = require('../utils/logger');

let redis;
let analysisQueue;

function redisConnection() {
  if (!redis) {
    redis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (times) => Math.min(times * 100, 5000),
    });

    redis.on('error', (err) => logger.error('Redis error', { error: err.message }));
  }

  return redis;
}

async function initQueue() {
  if (!analysisQueue) {
    analysisQueue = new Queue('pr-analysis', {
      connection: redisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    });

    logger.info('Queue initialized', { queue: 'pr-analysis' });
  }

  return analysisQueue;
}

function getAnalysisQueue() {
  if (!analysisQueue) {
    throw new Error('Queue not initialized; call initQueue first');
  }
  return analysisQueue;
}

module.exports = {
  initQueue,
  getAnalysisQueue,
  redisConnection,
};
