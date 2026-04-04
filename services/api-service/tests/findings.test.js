const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../src/config/database', () => ({
  pool: { query: jest.fn() },
  transaction: jest.fn(),
}));

jest.mock('../src/db/findings', () => ({
  listByPullRequest: jest.fn(),
  listAll: jest.fn(),
  getById: jest.fn(),
  updateStatus: jest.fn(),
  listByAnalysisRun: jest.fn(),
}));

const findingsDb = require('../src/db/findings');
const { createApp } = require('../src/app');

const JWT_SECRET = 'test-jwt-secret';
process.env.JWT_SECRET = JWT_SECRET;

function authToken(userId = 'user-uuid-1') {
  return jwt.sign({ user_id: userId, github_id: 123, github_username: 'testuser' }, JWT_SECRET);
}

const MOCK_FINDING = {
  id: 'finding-1',
  title: 'SQL Injection',
  severity: 'critical',
  confidence: 0.92,
  file_path: 'app.py',
  line_start: 10,
  status: 'open',
  cwe_id: 'CWE-89',
};

describe('GET /api/findings', () => {
  test('returns all findings for user', async () => {
    findingsDb.listAll.mockResolvedValueOnce([MOCK_FINDING]);

    const app = createApp();
    const res = await request(app)
      .get('/api/findings')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.findings).toHaveLength(1);
    expect(res.body.findings[0].title).toBe('SQL Injection');
  });

  test('passes filters to query', async () => {
    findingsDb.listAll.mockResolvedValueOnce([]);

    const app = createApp();
    await request(app)
      .get('/api/findings?severity=critical&status=open&category=SQL+injection')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(findingsDb.listAll).toHaveBeenCalledWith(
      'user-uuid-1',
      expect.objectContaining({ severity: 'critical', status: 'open', category: 'SQL injection' })
    );
  });

  test('returns 401 without auth', async () => {
    const app = createApp();
    const res = await request(app).get('/api/findings');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/findings/:id', () => {
  test('returns finding by id', async () => {
    findingsDb.getById.mockResolvedValueOnce(MOCK_FINDING);

    const app = createApp();
    const res = await request(app)
      .get('/api/findings/finding-1')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.finding.id).toBe('finding-1');
  });

  test('returns 404 for non-existent finding', async () => {
    findingsDb.getById.mockResolvedValueOnce(null);

    const app = createApp();
    const res = await request(app)
      .get('/api/findings/nonexistent')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/findings/:id/status', () => {
  test('updates finding status to dismissed', async () => {
    findingsDb.updateStatus.mockResolvedValueOnce({ ...MOCK_FINDING, status: 'dismissed' });

    const app = createApp();
    const res = await request(app)
      .patch('/api/findings/finding-1/status')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ status: 'dismissed', dismissal_reason: 'False positive' });

    expect(res.status).toBe(200);
    expect(res.body.finding.status).toBe('dismissed');
    expect(findingsDb.updateStatus).toHaveBeenCalledWith(
      'finding-1',
      'user-uuid-1',
      expect.objectContaining({ status: 'dismissed', dismissalReason: 'False positive' })
    );
  });

  test('rejects invalid status', async () => {
    const app = createApp();
    const res = await request(app)
      .patch('/api/findings/finding-1/status')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ status: 'invalid-status' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid status');
  });

  test('returns 404 if finding not found', async () => {
    findingsDb.updateStatus.mockResolvedValueOnce(null);

    const app = createApp();
    const res = await request(app)
      .patch('/api/findings/nonexistent/status')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ status: 'dismissed' });

    expect(res.status).toBe(404);
  });

  test('accepts all valid statuses', async () => {
    const app = createApp();
    for (const status of ['open', 'dismissed', 'accepted_risk', 'fixed']) {
      findingsDb.updateStatus.mockResolvedValueOnce({ ...MOCK_FINDING, status });
      const res = await request(app)
        .patch('/api/findings/finding-1/status')
        .set('Authorization', `Bearer ${authToken()}`)
        .send({ status });
      expect(res.status).toBe(200);
    }
  });
});

describe('GET /api/pull-requests/:pullRequestId/findings', () => {
  test('returns findings for a PR', async () => {
    findingsDb.listByPullRequest.mockResolvedValueOnce([MOCK_FINDING]);

    const app = createApp();
    const res = await request(app)
      .get('/api/pull-requests/pr-uuid-1/findings')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.findings).toHaveLength(1);
  });

  test('passes status and confidence filters', async () => {
    findingsDb.listByPullRequest.mockResolvedValueOnce([]);

    const app = createApp();
    await request(app)
      .get('/api/pull-requests/pr-uuid-1/findings?status=all&min_confidence=0.8')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(findingsDb.listByPullRequest).toHaveBeenCalledWith(
      'pr-uuid-1',
      'user-uuid-1',
      expect.objectContaining({ status: 'all', minConfidence: '0.8' })
    );
  });
});
