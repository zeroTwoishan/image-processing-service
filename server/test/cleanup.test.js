import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import fs from 'node:fs/promises';
import mongoose from 'mongoose';
import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../src/app.js';
import { Image } from '../src/models/Image.js';
import { storage } from '../src/services/storage/index.js';
import { deleteExpiredImages, deleteOrphanFiles } from '../src/services/cleanup.js';
import { useTestDb } from './db.js';

useTestDb();

let app;
beforeEach(async () => {
  app = createApp();
  await fs.rm(storage.root, { recursive: true, force: true });
});
afterAll(() => fs.rm(storage.root, { recursive: true, force: true }));

async function signUp(username = 'ishan') {
  return (await request(app).post('/api/register').send({ username, password: 'correct horse' })).body.token;
}
async function uploadPhoto(token) {
  const buffer = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#c86432' } }).jpeg().toBuffer();
  const res = await request(app).post('/api/images').set('Authorization', `Bearer ${token}`).attach('image', buffer, 'photo.jpg');
  return res.body.image;
}
const transform = (token, id, transformations) =>
  request(app).post(`/api/images/${id}/transform`).set('Authorization', `Bearer ${token}`).send({ transformations });

// Ages a whole family (original + its versions), like 12 hours passing.
const expire = (originalId) =>
  Image.updateMany({ $or: [{ _id: originalId }, { parent: originalId }] }, { expiresAt: new Date(Date.now() - 1000) });

async function storedKeys() {
  const entries = await fs.readdir(storage.root, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries.filter((e) => e.isFile()).map((e) => e.name);
}
const fileName = (key) => key.split('/').pop();

describe('deleteExpiredImages', () => {
  it('removes an expired original and its versions (files and rows) and leaves fresh photos alone', async () => {
    const token = await signUp();
    const old = await uploadPhoto(token);
    await transform(token, old.id, { rotate: 90 });
    const fresh = await uploadPhoto(token);
    await expire(old.id);
    const freshRow = await Image.findById(fresh.id).lean();

    expect(await deleteExpiredImages()).toBe(2); // the original + its version

    expect(await Image.countDocuments()).toBe(1);
    expect(await Image.exists({ _id: fresh.id })).toBeTruthy();
    // 2 files left, and they are exactly the fresh photo's (original + thumbnail).
    expect((await storedKeys()).sort()).toEqual([freshRow.storageKey, freshRow.thumbnailKey].map(fileName).sort());
  });

  it('is harmless to run twice', async () => {
    const token = await signUp();
    await expire((await uploadPhoto(token)).id);

    expect(await deleteExpiredImages()).toBe(1);
    expect(await deleteExpiredImages()).toBe(0);
    expect(await storedKeys()).toEqual([]);
  });

  it('a run that crashes halfway leaves rows pointing at their files, and the next run finishes the job', async () => {
    const token = await signUp();
    for (let i = 0; i < 3; i++) await expire((await uploadPhoto(token)).id);

    // Storage fails after two files: the run stops before deleting any row.
    const original = storage.remove;
    let calls = 0;
    const remove = vi.spyOn(storage, 'remove').mockImplementation((key) => {
      if (++calls > 2) return Promise.reject(new Error('storage went away'));
      return original.call(storage, key);
    });
    await expect(deleteExpiredImages()).rejects.toThrow('storage went away');
    expect(await Image.countDocuments()).toBe(3); // files first: no row was deleted while its files might remain
    remove.mockRestore();

    expect(await deleteExpiredImages()).toBe(3); // already-missing files are fine
    expect(await Image.countDocuments()).toBe(0);
    expect(await storedKeys()).toEqual([]);
  });

  it('works through more expired images than one batch holds', async () => {
    const owner = new mongoose.Types.ObjectId();
    const past = new Date(Date.now() - 1000);
    // Rows only: their (missing) files are removed without error, which is all this test needs.
    await Image.collection.insertMany(
      Array.from({ length: 120 }, (_, i) => ({
        owner, originalName: `${i}.jpg`, storageKey: `originals/batch-${i}.jpg`, thumbnailKey: `thumbnails/batch-${i}.webp`,
        mimeType: 'image/jpeg', format: 'jpeg', size: 1, width: 1, height: 1, animated: false,
        parent: null, transformations: null, expiresAt: past,
      })),
    );

    expect(await deleteExpiredImages()).toBe(120);
    expect(await Image.countDocuments()).toBe(0);
  });
});

describe('deleteOrphanFiles', () => {
  // A file as if written `daysAgo` days ago.
  async function fileFrom(key, daysAgo) {
    await storage.save(key, Buffer.from('x'), 'text/plain');
    const when = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    await fs.utimes(`${storage.root}/${key}`, when, when);
  }

  it('deletes old files that no row points to, and keeps used files and new ones', async () => {
    const token = await signUp();
    const live = await Image.findById((await uploadPhoto(token)).id).lean();
    // The live photo's files, made to look old: still kept, because a row points at them.
    for (const key of [live.storageKey, live.thumbnailKey]) {
      const when = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      await fs.utimes(`${storage.root}/${key}`, when, when);
    }
    await fileFrom('originals/leftover-from-a-crash.jpg', 2); // old and unused: the one to delete
    await fileFrom('originals/upload-in-progress.jpg', 0); // unused but new: its row may be about to be saved

    expect(await deleteOrphanFiles()).toBe(1);
    expect((await storedKeys()).sort()).toEqual([fileName(live.storageKey), fileName(live.thumbnailKey), 'upload-in-progress.jpg'].sort());
  });
});
