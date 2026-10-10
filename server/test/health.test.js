import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('health', () => {
  it('GET /api/health/live returns 200', async () => {
    const res = await request(app).get('/api/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api/health/ready returns 503 when Mongo is not connected', async () => {
    // This file never connects to Mongo, so the ping must fail.
    const res = await request(app).get('/api/health/ready');
    expect(res.status).toBe(503);
  });

  it('unknown routes return the standard 404 error shape', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('malformed JSON returns 400 VALIDATION_FAILED', async () => {
    const res = await request(app)
      .post('/api/health/live')
      .set('Content-Type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
