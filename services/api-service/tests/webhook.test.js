const request = require('supertest');

jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
  },
  transaction: jest.fn(),
}));

jest.mock('../src/services/githubApp', () => ({
  verifyWebhookSignature: jest.fn(() => false),
}));
jest.mock('../src/services/prAnalysisOrchestrator', () => ({
  notifyAnalysisQueued: jest.fn(),
}));
jest.mock('../src/db/installations', () => ({
  upsertInstallation: jest.fn(),
}));

const { pool, transaction } = require('../src/config/database');
const { verifyWebhookSignature } = require('../src/services/githubApp');
const { notifyAnalysisQueued } = require('../src/services/prAnalysisOrchestrator');
const { createApp } = require('../src/app');

describe('webhook route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  test('does not queue analysis for an inactive repository', async () => {
    verifyWebhookSignature.mockReturnValue(true);

    pool.query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ id: 'repo-1' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'repo-1', baseline_set: false, is_active: false }] })
        .mockResolvedValueOnce({ rows: [{ id: 'pr-1' }] }),
    };
    transaction.mockImplementation(async (fn) => fn(client));

    const app = createApp();
    const response = await request(app)
      .post('/webhooks/github')
      .set('x-github-event', 'pull_request')
      .set('x-github-delivery', 'delivery-2')
      .set('x-hub-signature-256', 'sha256=valid')
      .send({
        action: 'opened',
        installation: { id: 42 },
        repository: {
          id: 999,
          name: 'service',
          full_name: 'acme/service',
          private: true,
          default_branch: 'main',
          language: 'JavaScript',
          html_url: 'https://github.com/acme/service',
          clone_url: 'https://github.com/acme/service.git',
        },
        pull_request: {
          id: 555,
          number: 12,
          title: 'Fix auth redirect',
          body: '',
          state: 'open',
          html_url: 'https://github.com/acme/service/pull/12',
          draft: false,
          head: { sha: 'abc123', ref: 'feature' },
          base: { sha: 'def456', ref: 'main' },
          user: { login: 'octocat' },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.analysis_queued).toBe(false);
    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO analysis_runs'),
      expect.anything()
    );
    expect(notifyAnalysisQueued).not.toHaveBeenCalled();
  });
});
