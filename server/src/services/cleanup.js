import { env } from '../config/env.js';
import { Image } from '../models/Image.js';
import { storage } from './storage/index.js';

const HOUR = 60 * 60 * 1000;
// Small batches: each one holds only a few rows in memory and sends a bounded number of deletes to storage.
const BATCH_SIZE = 50;
// A file this old can't belong to a live photo: every photo is deleted IMAGE_TTL_HOURS after upload. At least
// a day, and twice the TTL, so a file uploaded a second before its row is saved is never mistaken for an orphan.
const ORPHAN_AGE = Math.max(24 * HOUR, 2 * env.IMAGE_TTL_HOURS * HOUR);

/**
 * Deletes every image (original or version) past its expiresAt: its files first, then its row.
 *
 * Files first: if we crash in between, the rows are still there and point at the files, so the next run
 * finds them again. Rows first would leave files that nothing points to, which no query can ever find.
 * Safe to run twice, or after a crash: removing a file that's already gone is not an error (see storage),
 * and rows are only deleted after their files.
 * Versions share their original's expiresAt, so a whole family goes in the same run.
 */
export async function deleteExpiredImages(now = new Date()) {
  let deleted = 0;
  for (;;) {
    const batch = await Image.find({ expiresAt: { $lte: now } }, { storageKey: 1, thumbnailKey: 1 }).limit(BATCH_SIZE).lean();
    if (batch.length === 0) return deleted;
    // A failed remove rejects this whole run (no infinite loop on a storage outage); the next run retries.
    await Promise.all(batch.flatMap((image) => [storage.remove(image.storageKey), storage.remove(image.thumbnailKey)]));
    deleted += (await Image.deleteMany({ _id: { $in: batch.map((image) => image._id) } })).deletedCount;
  }
}

/**
 * The safety net (Supabase has no expiry rules of its own): deletes old files that no row points to, left
 * behind by a crash between saving files and saving their row, or by a bug. Rows are the source of truth, so
 * a file is only deleted when it's old AND no row names it.
 * shortcut: lists the whole bucket each run; fine for a bucket that 12-hour expiry keeps small, page through
 * it in chunks if it ever holds millions of files.
 */
export async function deleteOrphanFiles(now = new Date()) {
  const old = (await storage.list()).filter((file) => file.lastModified < now - ORPHAN_AGE).map((file) => file.key);
  let deleted = 0;
  for (let i = 0; i < old.length; i += BATCH_SIZE) {
    const keys = old.slice(i, i + BATCH_SIZE);
    const rows = await Image.find(
      { $or: [{ storageKey: { $in: keys } }, { thumbnailKey: { $in: keys } }] },
      { storageKey: 1, thumbnailKey: 1 },
    ).lean();
    const used = new Set(rows.flatMap((row) => [row.storageKey, row.thumbnailKey]));
    const orphans = keys.filter((key) => !used.has(key));
    await Promise.all(orphans.map((key) => storage.remove(key)));
    deleted += orphans.length;
  }
  return deleted;
}

/**
 * Runs the cleanup once now (a free Render server sleeps when idle, so "at startup" is when it catches up),
 * then every hour. Returns a function that stops the timer, for graceful shutdown.
 */
export function scheduleCleanup(intervalMs = HOUR) {
  let running = false;
  async function run() {
    // A slow run is still going: skip this tick. Two runs at once would be safe, just wasted work.
    if (running) return;
    running = true;
    try {
      const deleted = await deleteExpiredImages();
      if (deleted) console.log(`Cleanup: deleted ${deleted} expired images`);
      const orphans = await deleteOrphanFiles();
      if (orphans) console.log(`Cleanup: deleted ${orphans} orphaned files`);
    } catch (err) {
      console.error(`Cleanup failed, will retry on the next run: ${err.message}`);
    } finally {
      running = false;
    }
  }
  run();
  // unref(): the timer alone doesn't keep the process alive, so shutdown isn't held up by it.
  const timer = setInterval(run, intervalMs).unref();
  return () => clearInterval(timer);
}
