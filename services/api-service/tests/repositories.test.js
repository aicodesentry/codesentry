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

describe('repositories route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  test('requires authentication', async () => {
    const app = createApp();
    const response = await request(app).get('/api/repositories');

    expect(response.status).toBe(401);
  });

  test('returns repositories for authenticated user', async () => {
    const app = createApp();
    const token = jwt.sign({ user_id: 'user-1' }, process.env.JWT_SECRET);

    pool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'repo-1',
          full_name: 'acme/service',
          open_findings_count: '2',
          pull_request_count: '3',
        },
      ],
    });

    const response = await request(app)
      .get('/api/repositories')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.repositories).toHaveLength(1);
    expect(response.body.repositories[0].full_name).toBe('acme/service');
  });
});
