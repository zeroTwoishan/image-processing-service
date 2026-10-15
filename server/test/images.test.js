import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import fs from 'node:fs/promises';
import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { Image } from '../src/models/Image.js';
import { storage } from '../src/services/storage/index.js';
import { useTestDb } from './db.js';

useTestDb();

const MB = 1024 * 1024;
let app;

// Fresh app (fresh rate-limit counters) and an empty test upload folder before every test.
beforeEach(async () => {
  app = createApp();
  await fs.rm(storage.root, { recursive: true, force: true });
});
afterAll(() => fs.rm(storage.root, { recursive: true, force: true }));

// ---- helpers ----
// Test images are generated here, so no binary fixtures live in the repo.
const solid = (width, height, background = { r: 200, g: 100, b: 50 }) =>
  sharp({ create: { width, height, channels: 3, background } });

// A 400×300 JPEG tagged "rotate 90°" (EXIF orientation 6) plus camera details, like a phone photo held upright.
const sidewaysPhoto = () =>
  solid(400, 300).jpeg().withExifMerge({ IFD0: { Make: 'TestCam', Model: 'Phone 1' } }).withMetadata({ orientation: 6 }).toBuffer();

// Two *different* frames: the GIF encoder merges identical ones, which would make a 1-frame "animation".
const animatedGif = async () => {
  const frames = await Promise.all([{ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }].map((c) => solid(20, 10, c).png().toBuffer()));
  return sharp(frames, { join: { animated: true } }).gif().toBuffer();
};

async function signUp(username = 'ishan') {
  const res = await request(app).post('/api/register').send({ username, password: 'correct horse' });
  return res.body.token;
}

const upload = (token, buffer, filename = 'IMG_0420.jpg', contentType = 'image/jpeg') =>
  request(app).post('/api/images').set('Authorization', `Bearer ${token}`).attach('image', buffer, { filename, contentType });

// "/uploads/originals/<uuid>.jpg" → the stored bytes
const storedFile = (url) => storage.get(url.replace(/^\/uploads\//, ''));

async function storedFileCount() {
  const entries = await fs.readdir(storage.root, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries.filter((e) => e.isFile()).length;
}

// ---- tests ----
describe('POST /api/images', () => {
  it('turns a sideways phone photo upright and strips its EXIF (orientation, camera)', async () => {
    const token = await signUp();
    const res = await upload(token, await sidewaysPhoto());

    expect(res.status).toBe(201);
    expect(res.body.image).toMatchObject({
      originalName: 'IMG_0420.jpg',
      width: 300, // was 400×300 + "rotate 90°": the stored pixels are now upright
      height: 400,
      format: 'jpeg',
      mimeType: 'image/jpeg',
      animated: false,
      parent: null,
      transformations: null,
    });

    const stored = await storedFile(res.body.image.url);
    const meta = await sharp(stored).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
    expect([meta.width, meta.height]).toEqual([300, 400]);
    expect(stored.includes('TestCam')).toBe(false); // camera details gone from the bytes themselves
    expect(res.body.image.size).toBe(stored.length);
  });

  it('never sends storage keys or the owner to the client', async () => {
    const res = await upload(await signUp(), await solid(40, 30).jpeg().toBuffer());
    expect(res.body.image).not.toHaveProperty('storageKey');
    expect(res.body.image).not.toHaveProperty('thumbnailKey');
    expect(res.body.image).not.toHaveProperty('owner');
    expect(res.body.image).not.toHaveProperty('_id');
  });

  it('makes a WebP thumbnail at most 400px wide, served from /uploads', async () => {
    const res = await upload(await signUp(), await solid(1200, 800).jpeg().toBuffer());

    const thumb = await request(app).get(res.body.image.thumbnailUrl);
    expect(thumb.status).toBe(200);
    expect(thumb.headers['content-type']).toBe('image/webp');
    const meta = await sharp(thumb.body).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 400, 267]);
  });

  it('names stored files by random UUID, never by the uploaded file name', async () => {
    const res = await upload(await signUp(), await solid(40, 30).jpeg().toBuffer(), '../../evil.jpg');
    expect(res.body.image.url).toMatch(/^\/uploads\/originals\/[0-9a-f-]{36}\.jpg$/);
    expect(res.body.image.thumbnailUrl).toMatch(/^\/uploads\/thumbnails\/[0-9a-f-]{36}\.webp$/);
  });

  it('sets expiresAt 12 hours after upload (UTC)', async () => {
    const res = await upload(await signUp(), await solid(40, 30).jpeg().toBuffer());
    const msUntilExpiry = new Date(res.body.image.expiresAt) - Date.now();
    expect(Math.abs(msUntilExpiry - 12 * 60 * 60 * 1000)).toBeLessThan(10_000);
    expect(res.body.image.expiresAt).toMatch(/Z$/);
  });

  it('rejects a text file renamed to .jpg with 400 UNSUPPORTED_FILE and saves nothing', async () => {
    const res = await upload(await signUp(), Buffer.from('just some notes, not a photo'), 'photo.jpg', 'image/jpeg');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE');
    expect(await storedFileCount()).toBe(0);
    expect(await Image.countDocuments()).toBe(0);
  });

  it('rejects a type that is not on the list (by the claimed type, before reading the bytes)', async () => {
    const res = await upload(await signUp(), Buffer.from('<svg/>'), 'logo.svg', 'image/svg+xml');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE');
  });

  it('rejects files over 10 MB with 413 FILE_TOO_LARGE', async () => {
    const res = await upload(await signUp(), Buffer.alloc(11 * MB), 'huge.jpg');
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('rejects a decompression bomb (a small file with over 25 megapixels) with 413', async () => {
    const bomb = await solid(6000, 5000).png().toBuffer(); // 30 MP of one colour compresses to ~400 KB
    expect(bomb.length).toBeLessThan(1 * MB);

    const res = await upload(await signUp(), bomb, 'flat.png', 'image/png');
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('stores animated GIFs untouched and marks them animated', async () => {
    const gif = await animatedGif();
    const res = await upload(await signUp(), gif, 'loop.gif', 'image/gif');

    expect(res.status).toBe(201);
    expect(res.body.image).toMatchObject({ animated: true, format: 'gif', width: 20, height: 10 }); // one frame's size
    expect(Buffer.compare(await storedFile(res.body.image.url), gif)).toBe(0); // byte-for-byte the upload
  });

  it('accepts AVIF', async () => {
    const res = await upload(await signUp(), await solid(40, 30).avif().toBuffer(), 'photo.avif', 'image/avif');
    expect(res.status).toBe(201);
    expect(res.body.image).toMatchObject({ format: 'avif', mimeType: 'image/avif' });
  });

  it('401 without a token', async () => {
    const res = await request(app).post('/api/images').attach('image', Buffer.from('x'), 'a.jpg');
    expect(res.status).toBe(401);
  });

  it('400 when no file is attached', async () => {
    const res = await request(app).post('/api/images').set('Authorization', `Bearer ${await signUp()}`).field('note', 'no file');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('leaves no files behind when saving the database row fails', async () => {
    const token = await signUp();
    const create = vi.spyOn(Image, 'create').mockRejectedValueOnce(new Error('database went away'));
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {}); // the error handler logs the 500

    const res = await upload(token, await solid(40, 30).jpeg().toBuffer());

    expect(res.status).toBe(500);
    expect(await storedFileCount()).toBe(0); // the original and thumbnail were saved, then removed
    create.mockRestore();
    quiet.mockRestore();
  });
});

describe('GET /api/images/:id', () => {
  it('returns your image with an empty versions list', async () => {
    const token = await signUp();
    const { body } = await upload(token, await solid(40, 30).jpeg().toBuffer());

    const res = await request(app).get(`/api/images/${body.image.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ image: body.image, versions: [] });
  });

  it('another user gets 404, not 403 (we don’t confirm the image exists)', async () => {
    const { body } = await upload(await signUp('ishan'), await solid(40, 30).jpeg().toBuffer());
    const stranger = await signUp('stranger');

    const res = await request(app).get(`/api/images/${body.image.id}`).set('Authorization', `Bearer ${stranger}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('a malformed id is a 404, not a 500', async () => {
    const res = await request(app).get('/api/images/not-an-id').set('Authorization', `Bearer ${await signUp()}`);
    expect(res.status).toBe(404);
  });

  it('401 without a token', async () => {
    expect((await request(app).get('/api/images/abc')).status).toBe(401);
  });
});
