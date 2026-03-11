const request = require('supertest');

jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
  },
  transaction: jest.fn(),
}));

jest.mock('../src/config/queue', () => ({
  getAnalysisQueue: jest.fn(() => ({ add: jest.fn() })),
}));

jest.mock('../src/services/githubApp', () => ({
  verifyWebhookSignature: jest.fn(() => false),
}));

const { createApp } = require('../src/app');

describe('webhook route', () => {
  test('rejects invalid webhook signature', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/webhooks/github')
      .set('x-github-event', 'pull_request')
      .set('x-github-delivery', 'delivery-1')
      .set('x-hub-signature-256', 'sha256=invalid')
      .send({ action: 'opened' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid signature');
  });
});
