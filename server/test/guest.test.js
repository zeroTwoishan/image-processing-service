import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { Image } from '../src/models/Image.js';
import { storage } from '../src/services/storage/index.js';
import { useTestDb } from './db.js';

useTestDb();

let app;
beforeEach(async () => {
  app = createApp(); // fresh guest counters for every test
  await fs.rm(storage.root, { recursive: true, force: true });
});
afterAll(() => fs.rm(storage.root, { recursive: true, force: true }));

const photo = () => sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 200, g: 100, b: 50 } } }).jpeg().toBuffer();

// No Authorization header anywhere in this file: guests have no account.
const guestTransform = (buffer, transformations, { filename = 'IMG_0420.jpg', contentType = 'image/jpeg' } = {}) =>
  request(app)
    .post('/api/guest/transform')
    .attach('image', buffer, { filename, contentType })
    .field('transformations', typeof transformations === 'string' ? transformations : JSON.stringify(transformations));

describe('POST /api/guest/transform', () => {
  it('sends the edited image back as bytes, without a login', async () => {
    const res = await guestTransform(await photo(), { rotate: 90, resize: { width: 150 }, format: 'webp' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/webp');
    expect(res.headers['cache-control']).toBe('no-store');
    const meta = await sharp(res.body).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 150, 200]); // 300×400 after the turn, then 150 wide
  });

  it('keeps the original format when none is chosen', async () => {
    const res = await guestTransform(await photo(), { filters: { grayscale: true } });
    expect(res.headers['content-type']).toBe('image/jpeg');
  });

  it('writes nothing: no rows in Mongo, no files in storage', async () => {
    const res = await guestTransform(await photo(), { filters: { sepia: true } });

    expect(res.status).toBe(200);
    expect(await Image.countDocuments()).toBe(0);
    expect(await storage.list()).toEqual([]);
  });

  it('rejects edits that are not JSON', async () => {
    const res = await guestTransform(await photo(), '{rotate: 90');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('checks the edits like a logged-in transform', async () => {
    const bad = await guestTransform(await photo(), { rotate: 45 });
    expect(bad.body.error.code).toBe('VALIDATION_FAILED');

    const tooBig = await guestTransform(await photo(), { crop: { x: 300, y: 0, width: 200, height: 100 } });
    expect(tooBig.status).toBe(400);
    expect(tooBig.body.error.code).toBe('INVALID_CROP');
  });

  it('rejects a fake image, and real images in formats we do not accept', async () => {
    const fake = await guestTransform(Buffer.from('definitely not a picture'), { format: 'webp' }, { filename: 'x.png', contentType: 'image/png' });
    expect(fake.status).toBe(400);
    expect(fake.body.error.code).toBe('UNSUPPORTED_FILE');

    // A real TIFF, labelled as a JPEG: the label passes multer, the header check catches it.
    const tiff = await sharp(await photo()).tiff().toBuffer();
    const res = await guestTransform(tiff, { format: 'webp' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE');
  });

  it('needs a file', async () => {
    const res = await request(app).post('/api/guest/transform').field('transformations', '{"rotate":90}');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('allows 5 a minute per IP, then answers 429 with Retry-After', async () => {
    // Failed requests count too (the limiter runs first), so cheap invalid ones fill the window quickly.
    for (let i = 0; i < 5; i++) expect((await guestTransform(await photo(), 'not json')).status).toBe(400);

    const res = await guestTransform(await photo(), { rotate: 90 });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });
});
