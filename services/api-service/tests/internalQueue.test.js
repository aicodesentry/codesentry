const request = require('supertest');

jest.mock('../src/db/analysisRuns', () => ({
  getQueueStats: jest.fn(),
}));

jest.mock('../src/services/prAnalysisOrchestrator', () => ({
  notifyAnalysisQueued: jest.fn(),
}));

const analysisRunsDb = require('../src/db/analysisRuns');
const { notifyAnalysisQueued } = require('../src/services/prAnalysisOrchestrator');
const { createApp } = require('../src/app');

describe('internal analysis queue routes', () => {
  const originalSecret = process.env.GITHUB_SERVICE_INTERNAL_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GITHUB_SERVICE_INTERNAL_SECRET = 'test-internal-secret';
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.GITHUB_SERVICE_INTERNAL_SECRET;
    } else {
      process.env.GITHUB_SERVICE_INTERNAL_SECRET = originalSecret;
    }
  });

  test('rejects missing internal secret header', async () => {
    const app = createApp();

    const response = await request(app).post('/internal/analysis-queue/tick').send({});

    expect(response.status).toBe(401);
    expect(notifyAnalysisQueued).not.toHaveBeenCalled();
  });

  test('wakes the analysis queue and returns queue stats', async () => {
    analysisRunsDb.getQueueStats.mockResolvedValueOnce({
      pending: 2,
      running: 1,
      failed: 0,
      oldest_pending_seconds: 45,
    });

    const app = createApp();
    const response = await request(app)
      .post('/internal/analysis-queue/tick')
      .set('x-internal-secret', 'test-internal-secret')
      .send({});

    expect(response.status).toBe(200);
    expect(notifyAnalysisQueued).toHaveBeenCalledTimes(1);
    expect(response.body).toEqual({
      ok: true,
      queued: true,
      queue: {
        pending: 2,
        running: 1,
        failed: 0,
        oldest_pending_seconds: 45,
      },
    });
  });
});
