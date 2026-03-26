const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  pool: {
    query: jest.fn(),
  },
  transaction: jest.fn(),
}));

const { pool } = require('../src/config/database');
const { createApp } = require('../src/app');

describe('repository connect/disconnect', () => {
  let token;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    token = jwt.sign({ user_id: 'user-1' }, process.env.JWT_SECRET);
  });

  test('POST /:id/connect activates a repository', async () => {
    const app = createApp();

    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 'repo-1', full_name: 'acme/service', is_active: true }],
    });

    const response = await request(app)
      .post('/api/repositories/repo-1/connect')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.connected).toBe(true);
    expect(response.body.repository.is_active).toBe(true);
  });

  test('POST /:id/disconnect deactivates a repository', async () => {
    const app = createApp();

    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 'repo-1', full_name: 'acme/service', is_active: false }],
    });

    const response = await request(app)
      .post('/api/repositories/repo-1/disconnect')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.connected).toBe(false);
    expect(response.body.repository.is_active).toBe(false);
  });

  test('connect returns 404 for unknown repo', async () => {
    const app = createApp();

    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const response = await request(app)
      .post('/api/repositories/unknown-id/connect')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  test('disconnect returns 404 for unknown repo', async () => {
    const app = createApp();

    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const response = await request(app)
      .post('/api/repositories/unknown-id/disconnect')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  test('connect requires auth', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/repositories/repo-1/connect');

    expect(response.status).toBe(401);
  });

  test('list returns both active and inactive repos', async () => {
    const app = createApp();

    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 'repo-1', full_name: 'acme/active', is_active: true },
        { id: 'repo-2', full_name: 'acme/inactive', is_active: false },
      ],
    });

    const response = await request(app)
      .get('/api/repositories')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.repositories).toHaveLength(2);
  });
});
