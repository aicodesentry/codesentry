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

function authToken(userId = 'user-uuid-1') {
  return jwt.sign({ user_id: userId, github_id: 123, github_username: 'testuser' }, JWT_SECRET);
}

function hasSuppressionInsert() {
  return pool.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO suppressions'));
}

function findFindingLookupCall() {
  return pool.query.mock.calls.find(([sql]) => String(sql).includes('SELECT fingerprint FROM findings'));
}

function findSuppressionInsertCall() {
  return pool.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO suppressions'));
}

const REPOSITORY_ID = 'repo-uuid-1';
const OTHER_FINDING_ID = 'finding-other-repo';
const FINDING_ID = 'finding-uuid-1';
const FINGERPRINT = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

describe('POST /api/suppressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 404 and does not insert when finding belongs to a different repository', async () => {
    pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: REPOSITORY_ID }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const app = createApp();
    const response = await request(app)
      .post('/api/suppressions')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({
        repository_id: REPOSITORY_ID,
        finding_id: OTHER_FINDING_ID,
        reason: 'false_positive',
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Finding not found' });
    expect(hasSuppressionInsert()).toBe(false);

    const lookupCall = findFindingLookupCall();
    expect(lookupCall[1]).toEqual([OTHER_FINDING_ID, REPOSITORY_ID]);
  });

  test('stores fingerprint read from finding when finding belongs to requested repository', async () => {
    pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: REPOSITORY_ID }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ fingerprint: FINGERPRINT }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'suppression-uuid-1',
          repository_id: REPOSITORY_ID,
          finding_id: FINDING_ID,
          fingerprint: FINGERPRINT,
          reason: 'false_positive',
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const app = createApp();
    const response = await request(app)
      .post('/api/suppressions')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({
        repository_id: REPOSITORY_ID,
        finding_id: FINDING_ID,
        reason: 'false_positive',
      });

    expect(response.status).toBe(201);
    expect(response.body.suppression.fingerprint).toBe(FINGERPRINT);

    const lookupCall = findFindingLookupCall();
    expect(lookupCall[1]).toEqual([FINDING_ID, REPOSITORY_ID]);

    const insertCall = findSuppressionInsertCall();
    expect(insertCall[1]).toEqual([
      FINDING_ID,
      REPOSITORY_ID,
      FINGERPRINT,
      'false_positive',
      null,
      'user-uuid-1',
      null,
    ]);
  });

  test('allows explicit fingerprint without finding lookup', async () => {
    pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: REPOSITORY_ID }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'suppression-uuid-2',
          repository_id: REPOSITORY_ID,
          finding_id: null,
          fingerprint: FINGERPRINT,
          reason: 'accepted_risk',
        }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const app = createApp();
    const response = await request(app)
      .post('/api/suppressions')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({
        repository_id: REPOSITORY_ID,
        fingerprint: FINGERPRINT,
        reason: 'accepted_risk',
      });

    expect(response.status).toBe(201);
    expect(response.body.suppression.fingerprint).toBe(FINGERPRINT);
    expect(findFindingLookupCall()).toBeUndefined();
  });

  test('returns 404 for repository caller cannot access', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const app = createApp();
    const response = await request(app)
      .post('/api/suppressions')
      .set('Authorization', `Bearer ${authToken()}`)
      .send({
        repository_id: REPOSITORY_ID,
        finding_id: FINDING_ID,
        reason: 'false_positive',
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Repository not found' });
    expect(hasSuppressionInsert()).toBe(false);
    expect(findFindingLookupCall()).toBeUndefined();
  });
});

describe('GET /api/suppressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('only joins finding metadata from the suppression repository', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const app = createApp();
    const response = await request(app)
      .get('/api/suppressions')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(response.status).toBe(200);
    expect(pool.query.mock.calls[0][0]).toContain(
      'LEFT JOIN findings f ON f.id = s.finding_id AND f.repository_id = s.repository_id'
    );
  });
});
