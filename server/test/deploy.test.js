import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import request from 'supertest';
import { createApp } from '../src/app.js';

// env.js exits the process when a setting is wrong, so each case boots it in its own Node process.
function bootEnv(overrides) {
  const env = { ...process.env, ...overrides };
  for (const key of ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'CLIENT_ORIGIN']) {
    if (!(key in overrides)) delete env[key]; // don't let your own shell's settings leak into the test
  }
  return spawnSync(process.execPath, ['--input-type=module', '-e', "await import('./src/config/env.js')"], {
    cwd: `${import.meta.dirname}/..`,
    env,
    encoding: 'utf8',
  });
}

const s3Settings = {
  STORAGE_DRIVER: 's3',
  S3_ENDPOINT: 'https://abcd.storage.supabase.co/storage/v1/s3',
  S3_REGION: 'ap-south-1',
  S3_BUCKET: 'images',
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
  PUBLIC_ASSET_BASE: 'https://abcd.supabase.co/storage/v1/object/public/images',
};

// Starting Node takes seconds on a slow, busy laptop, so these get more than the default 5 s.
describe('environment checks at boot', { timeout: 30_000 }, () => {
  it('refuses STORAGE_DRIVER=s3 without the bucket settings and a public URL', () => {
    const { status, stderr } = bootEnv({ STORAGE_DRIVER: 's3' });
    expect(status).toBe(1);
    for (const key of ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'PUBLIC_ASSET_BASE']) {
      expect(stderr).toContain(key);
    }
  });

  it('refuses production without CLIENT_ORIGIN', () => {
    const { status, stderr } = bootEnv({ ...s3Settings, NODE_ENV: 'production' });
    expect(status).toBe(1);
    expect(stderr).toContain('CLIENT_ORIGIN');
  });

  it('boots with a complete production setup', () => {
    const { status, stderr } = bootEnv({ ...s3Settings, NODE_ENV: 'production', CLIENT_ORIGIN: 'https://darkroom.vercel.app/' });
    expect(stderr).toBe('');
    expect(status).toBe(0);
  });
});

describe('cors', () => {
  const app = createApp();

  it('lets the client origin read responses, including the rate-limit headers', async () => {
    const res = await request(app).get('/api/health/live').set('Origin', 'http://client.test');
    expect(res.headers['access-control-allow-origin']).toBe('http://client.test');
    expect(res.headers['access-control-expose-headers']).toBe('Retry-After,RateLimit,RateLimit-Policy');
  });

  // The server doesn't refuse the request; it names the one allowed site, and the browser hides the response
  // from any page whose origin doesn't match. (CORS protects users in browsers, not the API from curl.)
  it("doesn't let other sites read responses", async () => {
    const res = await request(app).get('/api/health/live').set('Origin', 'https://evil.test');
    expect(res.headers['access-control-allow-origin']).toBe('http://client.test');
  });
});
