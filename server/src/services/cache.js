import { createHash } from 'node:crypto';
import { Image } from '../models/Image.js';
import { TRANSFORM_VERSION } from './transform.js';

// A fingerprint of "this photo + these edits + this pipeline version". JSON of an array, not glued strings:
// "1" + "23" and "12" + "3" would both give "123".
// Key order needs no sorting: transformations come from transformSchema, and Zod builds its output in the
// schema's field order, so { flip, rotate } and { rotate, flip } give the same JSON (the cache tests check it).
// shortcut: equal-looking edits written differently ({ rotate: 0 } vs {}) get different keys, which only means
// a duplicate version, never a wrong one; normalise them first if that ever matters.
export const cacheKeyFor = (imageId, transformations) =>
  createHash('sha256').update(JSON.stringify([TRANSFORM_VERSION, String(imageId), transformations])).digest('hex');

// Versions share their original's expiresAt, and the original was just checked to be live, so no expiry filter.
export const findCachedVersion = (cacheKey) => Image.findOne({ cacheKey });
