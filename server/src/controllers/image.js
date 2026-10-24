import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Image } from '../models/Image.js';
import { storage } from '../services/storage/index.js';
import { prepareUpload } from '../services/upload.js';
import { ApiError } from '../utils/ApiError.js';

const HOUR = 60 * 60 * 1000;

export async function uploadImage(req, res) {
  // Check the bytes and build the files first. A fake or oversized image fails here, before anything is saved.
  const { original, thumbnail } = await prepareUpload(req.file.buffer);

  try {
    await Promise.all([storage.save(original.key, original.buffer), storage.save(thumbnail.key, thumbnail.buffer)]);
    const image = await Image.create({
      owner: req.userId,
      originalName: req.file.originalname.slice(0, 255),
      storageKey: original.key,
      thumbnailKey: thumbnail.key,
      mimeType: original.mimeType,
      format: original.format,
      size: original.size,
      width: original.width,
      height: original.height,
      animated: original.animated,
      expiresAt: new Date(Date.now() + env.IMAGE_TTL_HOURS * HOUR), // Date is stored as UTC
    });
    res.status(201).json({ image });
  } catch (err) {
    // Files first, then the row. If anything after saving fails, remove the files, or they'd sit on disk
    // forever with no row pointing at them ("orphans"). remove() ignores files that were never written.
    await Promise.all([storage.remove(original.key), storage.remove(thumbnail.key)]);
    throw err;
  }
}

// Expired images are hidden here, at read time. The cleanup job (Phase 5) only runs hourly and may be late
// or crash, so it can't be what keeps an expired photo off the screen; it only frees the space.
const notExpired = () => ({ expiresAt: { $gt: new Date() } });

export async function listImages(req, res) {
  const { page, limit } = req.validatedQuery;
  const filter = { owner: req.userId, ...notExpired() };

  const [data, total] = await Promise.all([
    // _id breaks createdAt ties, so the order is the same on every query and paging never repeats or skips
    // an image. The sort matches the { owner, createdAt, _id } index, so Mongo reads it in order (no in-memory sort).
    Image.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
    Image.countDocuments(filter),
  ]);

  // shortcut: skip() walks past every earlier row, fine while images live 12 hours; switch to a cursor
  // ("after this createdAt + _id") if lists ever reach thousands.
  res.json({ data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
}

export async function getImage(req, res) {
  const { id } = req.params;
  // owner is part of the query: someone else's image simply isn't found. 404, not 403, so we don't even
  // confirm that the ID exists. A malformed ID is also just "not found", not a 500 from a failed cast.
  const image = mongoose.isValidObjectId(id) ? await Image.findOne({ _id: id, owner: req.userId, ...notExpired() }) : null;
  if (!image) throw new ApiError(404, 'NOT_FOUND', 'Image not found');
  res.json({ image, versions: [] }); // versions arrive in Phase 3
}
