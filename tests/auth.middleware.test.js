const jwt = require('jsonwebtoken');
const { verifyToken, requireRole } = require('../src/middleware/auth');

// Set a test secret before tests run
process.env.JWT_SECRET = 'test-secret-key';

function mockReqRes() {
  const req = { headers: {} };
  const res = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('verifyToken middleware', () => {
  test('rejects request with no token', () => {
    const { req, res, next } = mockReqRes();
    verifyToken(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Access token required');
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects request with invalid token', () => {
    const { req, res, next } = mockReqRes();
    req.headers['authorization'] = 'Bearer invalidtoken123';
    verifyToken(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Invalid or expired token');
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts valid token and attaches user to req', () => {
    const { req, res, next } = mockReqRes();
    const payload = { id: 1, role: 'captain', username: 'test' };
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    req.headers['authorization'] = `Bearer ${token}`;
    verifyToken(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe(1);
    expect(req.user.role).toBe('captain');
  });

  test('rejects expired token', () => {
    const { req, res, next } = mockReqRes();
    const token = jwt.sign({ id: 1, role: 'captain' }, process.env.JWT_SECRET, { expiresIn: -1 });
    req.headers['authorization'] = `Bearer ${token}`;
    verifyToken(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireRole middleware', () => {
  test('allows user with correct role', () => {
    const { req, res, next } = mockReqRes();
    req.user = { id: 1, role: 'admin' };
    requireRole('admin', 'captain')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('blocks user with wrong role', () => {
    const { req, res, next } = mockReqRes();
    req.user = { id: 2, role: 'cadet' };
    requireRole('admin', 'captain')(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Insufficient permissions');
    expect(next).not.toHaveBeenCalled();
  });
});
