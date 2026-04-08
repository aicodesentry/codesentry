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
jest.mock('../src/services/githubUserAuth', () => ({
  getGithubAccessTokenForUser: jest.fn(),
}));
jest.mock('../src/db/installations', () => ({
  listByUser: jest.fn(),
  upsertInstallation: jest.fn(),
  linkUserInstallation: jest.fn(),
  removeSameAccountStaleLinks: jest.fn(),
  reconcileUserInstallations: jest.fn(),
  deleteUnreferencedInstallations: jest.fn(),
}));
jest.mock('../src/db/repositories', () => ({
  revokeMissingAccessForInstallation: jest.fn(),
  queueForProfiling: jest.fn(),
}));

const axios = require('axios');
const { pool } = require('../src/config/database');
const { getInstallationToken } = require('../src/services/githubApp');
const { getGithubAccessTokenForUser } = require('../src/services/githubUserAuth');
const installationsDb = require('../src/db/installations');
const repositoriesDb = require('../src/db/repositories');
const { createApp } = require('../src/app');

describe('installation sync', () => {
  let token;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    token = jwt.sign({ user_id: 'user-1' }, process.env.JWT_SECRET);
    getGithubAccessTokenForUser.mockResolvedValue({
      token: 'plain-github-token',
      githubUsername: 'nebullii',
      refreshed: false,
    });
  });

  test('preserves connection state during sync and does not reset repositories inactive', async () => {
    const app = createApp();

    pool.query
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
    repositoriesDb.revokeMissingAccessForInstallation.mockResolvedValue({});
    getInstallationToken.mockRejectedValue(new Error('app token unavailable'));
    axios.get
      .mockResolvedValueOnce({
        data: {
          installations: [
            {
              id: 42,
              account: { login: 'acme', type: 'Organization' },
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
    expect(response.body.synced_installations).toBe(1);
    expect(response.body.synced_repositories).toBe(1);

    expect(installationsDb.removeSameAccountStaleLinks).toHaveBeenCalledWith(
      pool,
      'user-1',
      expect.objectContaining({ id: 42 })
    );
    expect(installationsDb.reconcileUserInstallations).toHaveBeenCalledWith(pool, 'user-1', [42]);
    expect(installationsDb.deleteUnreferencedInstallations).toHaveBeenCalledWith(pool);
    expect(repositoriesDb.revokeMissingAccessForInstallation).toHaveBeenCalledWith(
      'user-1',
      42,
      [999]
    );

    const executedSql = pool.query.mock.calls.map(([sql]) => sql);
    expect(executedSql.some((sql) => sql.includes('SET is_active = false'))).toBe(false);

    const repoUpsertSql = executedSql.find((sql) => sql.includes('INSERT INTO repositories'));
    expect(repoUpsertSql).toContain('VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)');
    expect(repoUpsertSql).not.toContain('is_active = true');
  });

  test('clears stale installation links when GitHub returns zero installations', async () => {
    const app = createApp();

    installationsDb.reconcileUserInstallations.mockResolvedValue({});
    installationsDb.deleteUnreferencedInstallations.mockResolvedValue({});

    axios.get.mockResolvedValueOnce({
      data: {
        installations: [],
      },
    });

    const response = await request(app)
      .post('/api/installations/sync')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.synced_installations).toBe(0);
    expect(response.body.synced_repositories).toBe(0);
    expect(installationsDb.reconcileUserInstallations).toHaveBeenCalledWith(pool, 'user-1', []);
    expect(installationsDb.deleteUnreferencedInstallations).toHaveBeenCalledWith(pool);
  });

  test('ignores user-owned installations that do not match the authenticated GitHub username', async () => {
    const app = createApp();

    installationsDb.upsertInstallation.mockResolvedValue({});
    installationsDb.linkUserInstallation.mockResolvedValue({});
    installationsDb.removeSameAccountStaleLinks.mockResolvedValue({});
    installationsDb.reconcileUserInstallations.mockResolvedValue({});
    installationsDb.deleteUnreferencedInstallations.mockResolvedValue({});

    axios.get.mockResolvedValueOnce({
      data: {
        installations: [
          {
            id: 119013181,
            account: { login: 'aicodesentry', type: 'User' },
            target_type: 'User',
            html_url: 'https://github.com/settings/installations/119013181',
            permissions: { contents: 'read' },
            events: ['pull_request'],
          },
          {
            id: 119431307,
            account: { login: 'virajrch', type: 'User' },
            target_type: 'User',
            html_url: 'https://github.com/settings/installations/119431307',
            permissions: { contents: 'read' },
            events: ['pull_request'],
          },
        ],
      },
    });

    const response = await request(app)
      .post('/api/installations/sync')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.synced_installations).toBe(0);
    expect(response.body.synced_repositories).toBe(0);
    expect(installationsDb.upsertInstallation).not.toHaveBeenCalled();
    expect(installationsDb.linkUserInstallation).not.toHaveBeenCalled();
    expect(installationsDb.reconcileUserInstallations).toHaveBeenCalledWith(pool, 'user-1', []);
    expect(installationsDb.deleteUnreferencedInstallations).toHaveBeenCalledWith(pool);
  });

  test('returns a reconnect message when the stored GitHub token is invalid', async () => {
    const app = createApp();
    getGithubAccessTokenForUser
      .mockResolvedValueOnce({
        token: 'plain-github-token',
        githubUsername: 'nebullii',
        refreshed: false,
      })
      .mockRejectedValueOnce(Object.assign(new Error('refresh unavailable'), { code: 'GITHUB_REFRESH_UNAVAILABLE' }));

    axios.get.mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          message: 'Bad credentials',
          documentation_url: 'https://docs.github.com/rest',
          status: '401',
        },
      },
    });

    const response = await request(app)
      .post('/api/installations/sync')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: 'GitHub connection expired or is invalid. Please sign in again.',
      code: 'GITHUB_TOKEN_INVALID',
      details: {
        message: 'Bad credentials',
        documentation_url: 'https://docs.github.com/rest',
        status: '401',
      },
    });
  });
});
