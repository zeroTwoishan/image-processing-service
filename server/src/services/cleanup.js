import { Image } from '../models/Image.js';
import { storage } from './storage/index.js';

const HOUR = 60 * 60 * 1000;
// Small batches: each one holds only a few rows in memory and sends a bounded number of deletes to storage.
const BATCH_SIZE = 50;

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
