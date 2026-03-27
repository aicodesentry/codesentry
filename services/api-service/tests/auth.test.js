const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  pool: { query: jest.fn() },
  transaction: jest.fn(),
}));

jest.mock('axios');
const axios = require('axios');
const { pool } = require('../src/config/database');
const { createApp } = require('../src/app');

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.GITHUB_CLIENT_ID = 'test-client-id';
  process.env.GITHUB_CLIENT_SECRET = 'test-client-secret';
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.FRONTEND_URL = 'http://localhost:5173';
  process.env.GITHUB_CALLBACK_URL = 'http://localhost:3000/auth/github/callback';
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('GET /auth/github', () => {
  test('redirects to GitHub OAuth with correct params', async () => {
    const app = createApp();
    const res = await request(app).get('/auth/github');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('github.com/login/oauth/authorize');
    expect(res.headers.location).toContain('client_id=test-client-id');
    expect(res.headers.location).toContain('redirect_uri=');
    expect(res.headers.location).toContain('scope=read:user');
  });

  test('returns 500 if GITHUB_CLIENT_ID not set', async () => {
    delete process.env.GITHUB_CLIENT_ID;
    const app = createApp();
    const res = await request(app).get('/auth/github');

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('not configured');
  });

  test('returns 500 if GITHUB_CLIENT_SECRET not set', async () => {
    delete process.env.GITHUB_CLIENT_SECRET;
    const app = createApp();
    const res = await request(app).get('/auth/github');

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('not configured');
  });

  test('uses GITHUB_CALLBACK_URL env var in redirect', async () => {
    process.env.GITHUB_CALLBACK_URL = 'https://api.example.com/auth/github/callback';
    const app = createApp();
    const res = await request(app).get('/auth/github');

    expect(res.headers.location).toContain(
      encodeURIComponent('https://api.example.com/auth/github/callback')
    );
  });
});

describe('GET /auth/github/callback', () => {
  const mockGitHubUser = {
    id: 12345,
    login: 'testuser',
    email: 'test@example.com',
    avatar_url: 'https://avatars.githubusercontent.com/u/12345',
    name: 'Test User',
  };

  const mockDbUser = {
    id: 'uuid-123',
    github_id: 12345,
    github_username: 'testuser',
    github_email: 'test@example.com',
    avatar_url: 'https://avatars.githubusercontent.com/u/12345',
    name: 'Test User',
  };

  function setupSuccessfulOAuth() {
    axios.post.mockResolvedValueOnce({
      data: { access_token: 'gho_test_token_123' },
    });
    axios.get.mockResolvedValueOnce({
      data: mockGitHubUser,
    });
    pool.query.mockResolvedValueOnce({
      rows: [mockDbUser],
    });
  }

  test('redirects with error if no code provided', async () => {
    const app = createApp();
    const res = await request(app).get('/auth/github/callback');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('error=no_oauth_code');
  });

  test('exchanges code for token and redirects with JWT', async () => {
    setupSuccessfulOAuth();
    const app = createApp();
    const res = await request(app).get('/auth/github/callback?code=test-code');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/dashboard?token=');

    // Verify token exchange was called correctly
    expect(axios.post).toHaveBeenCalledWith(
      'https://github.com/login/oauth/access_token',
      {
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        code: 'test-code',
      },
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      })
    );

    // Verify user was fetched
    expect(axios.get).toHaveBeenCalledWith(
      'https://api.github.com/user',
      expect.objectContaining({
        headers: { Authorization: 'Bearer gho_test_token_123' },
      })
    );

    // Verify DB upsert
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      expect.arrayContaining([12345, 'testuser', 'test@example.com'])
    );

    // Verify JWT is valid
    const token = new URL(res.headers.location).searchParams.get('token');
    const decoded = jwt.verify(token, 'test-jwt-secret');
    expect(decoded.github_username).toBe('testuser');
    expect(decoded.github_id).toBe(12345);
  });

  test('fetches email from /user/emails if not in profile', async () => {
    axios.post.mockResolvedValueOnce({
      data: { access_token: 'gho_test_token_123' },
    });
    axios.get
      .mockResolvedValueOnce({
        data: { ...mockGitHubUser, email: null },
      })
      .mockResolvedValueOnce({
        data: [
          { email: 'secondary@example.com', primary: false },
          { email: 'primary@example.com', primary: true },
        ],
      });
    pool.query.mockResolvedValueOnce({ rows: [mockDbUser] });

    const app = createApp();
    await request(app).get('/auth/github/callback?code=test-code');

    expect(axios.get).toHaveBeenCalledWith(
      'https://api.github.com/user/emails',
      expect.any(Object)
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      expect.arrayContaining(['primary@example.com'])
    );
  });

  test('redirects with error if token exchange fails', async () => {
    axios.post.mockResolvedValueOnce({
      data: { error: 'bad_verification_code' },
    });

    const app = createApp();
    const res = await request(app).get('/auth/github/callback?code=bad-code');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('error=oauth_exchange_failed');
  });

  test('redirects with error if GitHub API returns error', async () => {
    axios.post.mockResolvedValueOnce({
      data: { access_token: 'gho_test_token_123' },
    });
    axios.get.mockRejectedValueOnce(new Error('GitHub API error'));

    const app = createApp();
    const res = await request(app).get('/auth/github/callback?code=test-code');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('error=oauth_callback_failed');
  });

  test('redirects with error if DB upsert fails', async () => {
    axios.post.mockResolvedValueOnce({
      data: { access_token: 'gho_test_token_123' },
    });
    axios.get.mockResolvedValueOnce({ data: mockGitHubUser });
    pool.query.mockRejectedValueOnce(new Error('DB connection refused'));

    const app = createApp();
    const res = await request(app).get('/auth/github/callback?code=test-code');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('error=oauth_callback_failed');
  });
});

describe('GET /auth/me', () => {
  test('returns user with valid JWT', async () => {
    const token = jwt.sign(
      { user_id: 'uuid-123', github_id: 12345, github_username: 'testuser' },
      'test-jwt-secret',
      { expiresIn: '7d' }
    );

    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 'uuid-123',
        github_id: 12345,
        github_username: 'testuser',
        github_email: 'test@example.com',
        avatar_url: 'https://avatars.githubusercontent.com/u/12345',
        name: 'Test User',
        created_at: '2026-01-01T00:00:00Z',
      }],
    });

    const app = createApp();
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.github_username).toBe('testuser');
    expect(res.body.github_app_install_url).toContain('github.com/apps/');
  });

  test('returns 401 with no token', async () => {
    const app = createApp();
    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(401);
  });

  test('returns 401 with invalid token', async () => {
    const app = createApp();
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
  });

  test('returns 401 with expired token', async () => {
    const token = jwt.sign(
      { user_id: 'uuid-123', github_id: 12345, github_username: 'testuser' },
      'test-jwt-secret',
      { expiresIn: '0s' }
    );

    const app = createApp();
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  test('returns 404 if user not found in DB', async () => {
    const token = jwt.sign(
      { user_id: 'uuid-deleted', github_id: 99999, github_username: 'ghost' },
      'test-jwt-secret',
      { expiresIn: '7d' }
    );

    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const app = createApp();
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /auth/logout', () => {
  test('returns success', async () => {
    const app = createApp();
    const res = await request(app).post('/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
