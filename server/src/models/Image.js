import mongoose from 'mongoose';
import { env } from '../config/env.js';

const { ObjectId, Mixed } = mongoose.Schema.Types;

const imageSchema = new mongoose.Schema(
  {
    owner: { type: ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true }, // shown to the user only; never used in a file path
    // Where the files live in storage ("originals/<uuid>.jpg"). Keys, not URLs: see toJSON below.
    storageKey: { type: String, required: true },
    thumbnailKey: { type: String, required: true },
    mimeType: { type: String, required: true },
    format: { type: String, required: true },
    size: { type: Number, required: true }, // bytes of the stored file
    width: { type: Number, required: true },
    height: { type: Number, required: true }, // one frame's height for animated images
    animated: { type: Boolean, default: false },
    parent: { type: ObjectId, ref: 'Image', default: null }, // null = an original; set on versions (Phase 3)
    transformations: { type: Mixed, default: null },
    // Versions only (services/cache.js). No default on purpose: originals must not have the field at all, or
    // the unique index below would see a second original's null as a duplicate of the first's.
    cacheKey: { type: String },
    // A point in time (UTC), not "12 hours": "expiresAt < now" is one indexed query, whatever the server's timezone.
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        // URLs are built here, at the last moment, from one env var. Changing domains never touches the database.
        ret.url = `${env.PUBLIC_ASSET_BASE}/${ret.storageKey}`;
        ret.thumbnailUrl = `${env.PUBLIC_ASSET_BASE}/${ret.thumbnailKey}`;
        delete ret._id;
        delete ret.__v;
        delete ret.owner;
        delete ret.storageKey;
        delete ret.thumbnailKey;
        delete ret.cacheKey; // an internal detail, like the storage keys
        return ret;
      },
    },
  },
);

// One index per query that needs it. Field order matters: Mongo can use the index for
// "owner = X, sorted by createdAt desc" only because owner comes first.
imageSchema.index({ owner: 1, createdAt: -1, _id: -1 }); // gallery: my images, newest first (_id breaks ties)
imageSchema.index({ owner: 1, parent: 1 }); // versions of one original (Phase 3)
imageSchema.index({ expiresAt: 1 }); // cleanup job: everything already expired (Phase 5)
// Transform cache: one version per key. Unique, so two identical requests racing each other can't both save
// (the loser gets error E11000). Partial: only documents whose cacheKey is a string are in the index, so
// originals (no key) never clash. A sparse index wouldn't do: it still indexes an explicit null.
imageSchema.index({ cacheKey: 1 }, { unique: true, partialFilterExpression: { cacheKey: { $type: 'string' } } });

export const Image = mongoose.model('Image', imageSchema);
