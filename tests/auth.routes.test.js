process.env.JWT_SECRET = 'test-secret-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost/test';

// Mock the DB pool — no real DB needed
jest.mock('../src/db/pool.js', () => ({
  query: jest.fn(),
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/index.js');
const pool = require('../src/db/pool.js');

// Prevent app from actually listening during tests
beforeAll(() => {
  app.listen = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  test('returns 400 if email or password missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email and password required');
  });

  test('returns 409 if email already registered', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // existing user found
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'existing@test.com', password: 'password123' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });

  test('returns 201 with token on successful registration', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // no existing user
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'new@test.com', role: 'officer' }] }); // insert result
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@test.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('new@test.com');
  });
});

describe('POST /api/auth/login', () => {
  test('returns 400 if fields missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  test('returns 401 if user not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: 'pass' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  test('returns 401 if password is wrong', async () => {
    const hash = await bcrypt.hash('correctpassword', 1);
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'user@test.com', role: 'captain', password_hash: hash }] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  test('returns 200 with token on valid login', async () => {
    const hash = await bcrypt.hash('mypassword', 1);
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'captain@vessel.com', role: 'captain', password_hash: hash }],
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'captain@vessel.com', password: 'mypassword' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('captain');
  });
});

describe('GET /health', () => {
  test('returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Unknown routes', () => {
  test('returns 404 for unknown route', async () => {
    const res = await request(app).get('/api/doesnotexist');
    expect(res.status).toBe(404);
  });
});
