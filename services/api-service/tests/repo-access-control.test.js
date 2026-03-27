const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  pool: { query: jest.fn() },
  transaction: jest.fn(),
}));

const { pool } = require('../src/config/database');
const { createApp } = require('../src/app');

const JWT_SECRET = 'test-jwt-secret';
process.env.JWT_SECRET = JWT_SECRET;

function tokenFor(userId) {
  return jwt.sign({ user_id: userId, github_id: 123, github_username: 'user' }, JWT_SECRET);
}

const USER_A = 'user-a-uuid';
const USER_B = 'user-b-uuid';

beforeEach(() => jest.clearAllMocks());

describe('Repository access control', () => {
  test('user only sees repos they can access', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 'repo-1', full_name: 'userA/repo1' },
      ],
    });

    const app = createApp();
    const res = await request(app)
      .get('/api/repositories')
      .set('Authorization', `Bearer ${tokenFor(USER_A)}`);

    expect(res.status).toBe(200);
    expect(res.body.repositories).toHaveLength(1);
    expect(res.body.repositories[0].full_name).toBe('userA/repo1');

    // Verify query uses repository_access
    const queryCall = pool.query.mock.calls[0];
    expect(queryCall[0]).toContain('repository_access');
    expect(queryCall[1]).toContain(USER_A);
  });

  test('user cannot access another user repo by ID', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const app = createApp();
    const res = await request(app)
      .get('/api/repositories/repo-owned-by-other')
      .set('Authorization', `Bearer ${tokenFor(USER_B)}`);

    expect(res.status).toBe(404);
  });

  test('user cannot connect another user repo', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const app = createApp();
    const res = await request(app)
      .post('/api/repositories/repo-owned-by-other/connect')
      .set('Authorization', `Bearer ${tokenFor(USER_B)}`);

    expect(res.status).toBe(404);
  });

  test('user cannot disconnect another user repo', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const app = createApp();
    const res = await request(app)
      .post('/api/repositories/repo-owned-by-other/disconnect')
      .set('Authorization', `Bearer ${tokenFor(USER_B)}`);

    expect(res.status).toBe(404);
  });

  test('user cannot update baseline on another user repo', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const app = createApp();
    const res = await request(app)
      .patch('/api/repositories/repo-owned-by-other/baseline')
      .set('Authorization', `Bearer ${tokenFor(USER_B)}`)
      .send({ enabled: true });

    expect(res.status).toBe(404);
  });

  test('getById scopes by repository_access', async () => {
    pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'repo-1', full_name: 'userA/repo1' }],
      })
      .mockResolvedValueOnce({
        rows: [{ open_findings: 0, dismissed_findings: 0, accepted_risk_findings: 0, critical_open: 0, high_open: 0 }],
      });

    const app = createApp();
    const res = await request(app)
      .get('/api/repositories/repo-1')
      .set('Authorization', `Bearer ${tokenFor(USER_A)}`);

    expect(res.status).toBe(200);

    // Verify query uses repository_access, not legacy owner scoping
    const queryCall = pool.query.mock.calls[0];
    expect(queryCall[0]).toContain('repository_access');
  });
});

describe('PR webhook grants repository access', () => {
  test('webhook route upserts repository access rows', () => {
    // Read the actual source to verify the SQL
    const fs = require('fs');
    const webhookSource = fs.readFileSync(
      require.resolve('../src/routes/webhooks.js'),
      'utf8'
    );

    expect(webhookSource).toContain('grantRepositoryAccess');
    expect(webhookSource).toContain('INSERT INTO repository_access');
  });
});
