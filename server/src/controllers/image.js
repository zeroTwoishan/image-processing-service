import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Image } from '../models/Image.js';
import { storage } from '../services/storage/index.js';
import { prepareUpload } from '../services/upload.js';
import { applyTransform } from '../services/transform.js';
import { makeThumbnail } from '../services/thumbnail.js';
import { FORMATS } from '../services/formats.js';
import { ApiError } from '../utils/ApiError.js';

const HOUR = 60 * 60 * 1000;

// Expired images are hidden here, at read time. The cleanup job (Phase 5) only runs hourly and may be late
// or crash, so it can't be what keeps an expired photo off the screen; it only frees the space.
const notExpired = () => ({ expiresAt: { $gt: new Date() } });

// Saves both files, then the row. Shared by upload and transform, so the cleanup below exists exactly once.
async function storeImage(file, thumbnail, fields) {
  try {
    await Promise.all([storage.save(file.key, file.buffer, fields.mimeType), storage.save(thumbnail.key, thumbnail.buffer, 'image/webp')]);
    // "return await", not "return": without await, a failed create() would reject after we've left the try,
    // and the catch below would never run.
    return await Image.create({ ...fields, storageKey: file.key, thumbnailKey: thumbnail.key });
  } catch (err) {
    // Files first, then the row. If anything after saving fails, remove the files, or they'd sit on disk
    // forever with no row pointing at them ("orphans"). remove() ignores files that were never written.
    await Promise.all([storage.remove(file.key), storage.remove(thumbnail.key)]);
    throw err;
  }
}

// owner is part of the query: someone else's image simply isn't found. 404, not 403, so we don't even
// confirm that the ID exists. A malformed ID is also just "not found", not a 500 from a failed cast.
async function findOwnImage(req) {
  const { id } = req.params;
  const image = mongoose.isValidObjectId(id) ? await Image.findOne({ _id: id, owner: req.userId, ...notExpired() }) : null;
  if (!image) throw new ApiError(404, 'NOT_FOUND', 'Image not found');
  return image;
}

export async function uploadImage(req, res) {
  // Check the bytes and build the files first. A fake or oversized image fails here, before anything is saved.
  const { original, thumbnail } = await prepareUpload(req.file.buffer);

  const image = await storeImage(original, thumbnail, {
    owner: req.userId,
    originalName: req.file.originalname.slice(0, 255),
    mimeType: original.mimeType,
    format: original.format,
    size: original.size,
    width: original.width,
    height: original.height,
    animated: original.animated,
    expiresAt: new Date(Date.now() + env.IMAGE_TTL_HOURS * HOUR), // Date is stored as UTC
  });
  res.status(201).json({ image });
}

export async function transformImage(req, res) {
  const original = await findOwnImage(req);
  // Versions are never transformed again: chains would turn the versions list into a tree (harder deletes,
  // expiry and UI). To stack edits, send them together in one transform of the original.
  if (original.parent) {
    throw new ApiError(400, 'TRANSFORM_ON_VERSION', 'Only originals can be edited. Open the original to make a new version.');
  }

  const { transformations } = req.body;
  // Throws INVALID_TRANSFORM / INVALID_CROP before anything is saved.
  const { buffer, meta } = await applyTransform(await storage.get(original.storageKey), transformations);

  const id = randomUUID();
  const image = await storeImage(
    { key: `versions/${id}.${meta.ext}`, buffer },
    { key: `thumbnails/${id}.webp`, buffer: await makeThumbnail(buffer) },
    {
      owner: req.userId,
      parent: original._id,
      transformations, // stored, so every version says how it was made
      originalName: original.originalName.replace(/\.[^.]*$/, '').slice(0, 250) + `.${meta.ext}`, // IMG_0420.jpg → IMG_0420.webp
      mimeType: meta.mimeType,
      format: meta.format,
      size: meta.size,
      width: meta.width,
      height: meta.height,
      animated: false, // transforms use the first frame only
      expiresAt: original.expiresAt, // the whole family expires together
    },
  );
  res.status(201).json({ image });
}

// PATCH, not PUT: the request changes one field of the image, it doesn't replace the whole resource.
export async function renameImage(req, res) {
  const image = await findOwnImage(req);
  image.originalName = `${req.body.name}.${FORMATS[image.format].ext}`;
  await image.save();
  res.json({ image });
}

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
  const image = await findOwnImage(req);
  // An original's versions, newest first, found through the { owner, parent } index. A version has none.
  const versions = image.parent
    ? []
    : await Image.find({ owner: req.userId, parent: image._id, ...notExpired() }).sort({ createdAt: -1, _id: -1 });
  res.json({ image, versions });
}
