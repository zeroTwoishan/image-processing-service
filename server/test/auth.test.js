import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { useTestDb } from './db.js';

useTestDb();

// A fresh app per test, so the auth rate limit (step 5) never carries over between tests.
let app;
beforeEach(() => {
  app = createApp();
});

const register = (body) => request(app).post('/api/register').send(body);

describe('POST /api/register', () => {
  it('creates a user and returns it with a token', async () => {
    const res = await register({ username: 'ishan', password: 'correct horse' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ id: expect.any(String), username: 'ishan' });
    expect(res.body.token.split('.')).toHaveLength(3); // header.payload.signature
  });

  it('never returns the password or its hash', async () => {
    const res = await register({ username: 'ishan', password: 'correct horse' });

    expect(res.body.user).not.toHaveProperty('password');
    expect(res.body.user).not.toHaveProperty('passwordHash');
    expect(res.body.user).not.toHaveProperty('_id');
    expect(res.body.user).not.toHaveProperty('__v');
  });

  it('stores a bcrypt hash, not the password', async () => {
    await register({ username: 'ishan', password: 'correct horse' });

    const saved = await User.findOne({ username: 'ishan' });
    expect(saved.passwordHash).not.toBe('correct horse');
    expect(saved.passwordHash).toMatch(/^\$2b\$04\$/); // bcrypt, at the test cost (12 outside tests)
  });

  it('trims and lowercases the username', async () => {
    const res = await register({ username: '  Ishan_01 ', password: 'correct horse' });
    expect(res.body.user.username).toBe('ishan_01');
  });

  it('rejects "Ishan" after "ishan" with 409 USERNAME_TAKEN', async () => {
    await register({ username: 'ishan', password: 'correct horse' });
    const res = await register({ username: 'Ishan', password: 'another one' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('rejects a 73-byte password with 400', async () => {
    const res = await register({ username: 'ishan', password: 'a'.repeat(73) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details.fieldErrors.password).toBeDefined();
  });

  it('counts bytes, not characters: 37 × "é" is 74 bytes, so it is rejected', async () => {
    const res = await register({ username: 'ishan', password: 'é'.repeat(37) });
    expect(res.status).toBe(400);
  });

  it('accepts exactly 72 bytes', async () => {
    const res = await register({ username: 'ishan', password: 'a'.repeat(72) });
    expect(res.status).toBe(201);
  });

  it.each([
    ['too short', { username: 'ab', password: 'correct horse' }],
    ['bad characters', { username: 'ishan!', password: 'correct horse' }],
    ['short password', { username: 'ishan', password: 'short' }],
    ['missing fields', {}],
  ])('rejects %s with 400 VALIDATION_FAILED', async (_name, body) => {
    const res = await register(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('POST /api/login', () => {
  const login = (body) => request(app).post('/api/login').send(body);

  beforeEach(async () => {
    await register({ username: 'ishan', password: 'correct horse' });
  });

  it('returns the user and a token for the right password', async () => {
    const res = await login({ username: 'ishan', password: 'correct horse' });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('ishan');
    // The token's "sub" is the user's id (decode only reads it; it doesn't check the signature).
    expect(jwt.decode(res.body.token).sub).toBe(res.body.user.id);
  });

  it('is case-insensitive on the username', async () => {
    const res = await login({ username: ' ISHAN ', password: 'correct horse' });
    expect(res.status).toBe(200);
  });

  it('wrong password and unknown username give the identical 401', async () => {
    const wrongPassword = await login({ username: 'ishan', password: 'wrong horse' });
    const unknownUser = await login({ username: 'nobody', password: 'correct horse' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(unknownUser.body).toEqual(wrongPassword.body); // same code, same message
    expect(wrongPassword.body.error.code).toBe('UNAUTHORIZED');
  });

  it('a too-short password is just a wrong password (401), not a validation error', async () => {
    const res = await login({ username: 'ishan', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('still runs bcrypt for an unknown username (no timing leak)', async () => {
    const compare = vi.spyOn(bcrypt, 'compare');
    await login({ username: 'nobody', password: 'correct horse' });
    expect(compare).toHaveBeenCalledOnce();
    compare.mockRestore();
  });
});

describe('GET /api/me', () => {
  const me = (token) => {
    const req = request(app).get('/api/me');
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

  let user, token;
  beforeEach(async () => {
    ({ body: { user, token } } = await register({ username: 'ishan', password: 'correct horse' }));
  });

  it('returns the current user for a valid token', async () => {
    const res = await me(token);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(user);
  });

  it('401 without a token', async () => {
    const res = await me();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('401 for a malformed header', async () => {
    const res = await request(app).get('/api/me').set('Authorization', token); // no "Bearer "
    expect(res.status).toBe(401);
  });

  it('401 for a token signed with a different secret', async () => {
    const forged = jwt.sign({ sub: user.id }, 'some-other-secret-an-attacker-guessed');
    expect((await me(forged)).status).toBe(401);
  });

  it('401 when the payload is edited (signature no longer matches)', async () => {
    const [header, , signature] = token.split('.');
    const tampered = `${header}.${b64({ sub: '000000000000000000000000' })}.${signature}`;
    expect((await me(tampered)).status).toBe(401);
  });

  it('401 for an unsigned "alg: none" token', async () => {
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: user.id })}.`;
    expect((await me(unsigned)).status).toBe(401);
  });

  it('401 for an expired token', async () => {
    const expired = jwt.sign({ sub: user.id, exp: Math.floor(Date.now() / 1000) - 60 }, process.env.JWT_SECRET);
    expect((await me(expired)).status).toBe(401);
  });

  it('401 when the account was deleted after the token was issued', async () => {
    await User.deleteOne({ username: 'ishan' });
    expect((await me(token)).status).toBe(401);
  });
});

describe('auth rate limit (5 per minute per IP)', () => {
  // An empty body: the limiter counts it, then validation rejects it with a fast 400.
  // A real login would run bcrypt (~250 ms+) every time and push these tests toward the 5 s timeout.
  const attempt = (a = app) => request(a).post('/api/login').send({});

  it('lets 5 attempts through, then blocks the 6th with 429 RATE_LIMITED and Retry-After', async () => {
    for (let i = 1; i <= 5; i++) {
      expect((await attempt()).status).toBe(400); // got past the limiter, stopped by validation
    }

    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.headers['ratelimit-policy']).toBe('5;w=60');
  });

  it('counts /login and /register together', async () => {
    for (let i = 1; i <= 5; i++) await attempt();
    const res = await request(app).post('/api/register').send({ username: 'newuser', password: 'correct horse' });
    expect(res.status).toBe(429);
  });

  it('a new app from createApp() starts with fresh counters', async () => {
    for (let i = 1; i <= 6; i++) await attempt();
    expect((await attempt(createApp())).status).toBe(400);
  });
});
