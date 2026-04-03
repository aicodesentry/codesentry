const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
  },
  transaction: jest.fn(),
}));

jest.mock('axios');
jest.mock('../src/services/githubApp', () => ({
  getInstallationToken: jest.fn(),
}));
jest.mock('../src/db/installations', () => ({
  deleteUnreferencedInstallations: jest.fn(),
  linkUserInstallation: jest.fn(),
  listByUser: jest.fn(),
  reconcileUserInstallations: jest.fn(),
  removeSameAccountStaleLinks: jest.fn(),
  upsertInstallation: jest.fn(),
}));

const axios = require('axios');
const { pool } = require('../src/config/database');
const { getInstallationToken } = require('../src/services/githubApp');
const installationsDb = require('../src/db/installations');
const { createApp } = require('../src/app');

describe('installation sync reconciliation', () => {
  let token;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    token = jwt.sign({ user_id: 'user-1' }, process.env.JWT_SECRET);
  });

  test('reconciles same-account stale installations and preserves repo connection state', async () => {
    const app = createApp();

    pool.query
      .mockResolvedValueOnce({
        rows: [{ github_token: 'plain-github-token' }],
      })
      .mockResolvedValueOnce({
        rows: [{ id: 'repo-1' }],
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [],
      });

    installationsDb.upsertInstallation.mockResolvedValue({});
    installationsDb.linkUserInstallation.mockResolvedValue({});
    installationsDb.removeSameAccountStaleLinks.mockResolvedValue({});
    installationsDb.reconcileUserInstallations.mockResolvedValue({});
    installationsDb.deleteUnreferencedInstallations.mockResolvedValue({});

    getInstallationToken.mockRejectedValue(new Error('app token unavailable'));
    axios.get
      .mockResolvedValueOnce({
        data: {
          installations: [
            {
              id: 42,
              account: { login: 'Acme', type: 'Organization' },
              target_type: 'Organization',
              html_url: 'https://github.com/organizations/acme/settings/installations/42',
              permissions: { contents: 'read' },
              events: ['pull_request'],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        data: {
          repositories: [
            {
              id: 999,
              name: 'service',
              full_name: 'acme/service',
              private: true,
              default_branch: 'main',
              language: 'JavaScript',
              html_url: 'https://github.com/acme/service',
              clone_url: 'https://github.com/acme/service.git',
            },
          ],
        },
      });

    const response = await request(app)
      .post('/api/installations/sync')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    expect(installationsDb.removeSameAccountStaleLinks).toHaveBeenCalledWith(
      pool,
      'user-1',
      expect.objectContaining({ id: 42 })
    );
    expect(installationsDb.reconcileUserInstallations).toHaveBeenCalledWith(pool, 'user-1', [42]);
    expect(installationsDb.deleteUnreferencedInstallations).toHaveBeenCalledWith(pool);

    const executedSql = pool.query.mock.calls.map(([sql]) => sql);
    expect(executedSql.some((sql) => sql.includes('SET is_active = false'))).toBe(false);

    const repoUpsertSql = executedSql.find((sql) => sql.includes('INSERT INTO repositories'));
    expect(repoUpsertSql).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)');
    expect(repoUpsertSql).not.toContain('is_active = true');
  });
});
