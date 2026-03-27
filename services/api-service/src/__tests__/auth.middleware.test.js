const jwt = require('jsonwebtoken');

const TEST_JWT_SECRET = 'test-secret-for-unit-tests';
process.env.JWT_SECRET = TEST_JWT_SECRET;

const { authenticateToken } = require('../middleware/auth');

function mockReqResNext(overrides = {}) {
  const req = {
    cookies: {},
    headers: {},
    ...overrides,
  };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('authenticateToken middleware', () => {
  const validPayload = { id: 'user-1', github_username: 'dev' };

  it('returns 401 when no token is present', () => {
    const { req, res, next } = mockReqResNext();
    authenticateToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts token from Authorization header', () => {
    const token = jwt.sign(validPayload, TEST_JWT_SECRET);
    const { req, res, next } = mockReqResNext({
      headers: { authorization: `Bearer ${token}` },
    });
    authenticateToken(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('user-1');
  });

  it('accepts token from __session cookie', () => {
    const token = jwt.sign(validPayload, TEST_JWT_SECRET);
    const { req, res, next } = mockReqResNext({
      cookies: { __session: token },
    });
    authenticateToken(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('user-1');
  });

  it('returns 401 for an expired token', () => {
    const token = jwt.sign(validPayload, TEST_JWT_SECRET, { expiresIn: '0s' });
    const { req, res, next } = mockReqResNext({
      headers: { authorization: `Bearer ${token}` },
    });
    // small delay to ensure expiry
    authenticateToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a token signed with the wrong secret', () => {
    const token = jwt.sign(validPayload, 'wrong-secret');
    const { req, res, next } = mockReqResNext({
      headers: { authorization: `Bearer ${token}` },
    });
    authenticateToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a malformed token', () => {
    const { req, res, next } = mockReqResNext({
      headers: { authorization: 'Bearer not.a.valid.jwt' },
    });
    authenticateToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
