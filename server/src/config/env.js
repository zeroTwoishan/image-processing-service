import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  MONGO_URI: z.string().min(1),
  // Anyone who knows this secret can forge a login token for any user, so it must be long and random.
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  // bcrypt work factor: each +1 doubles the hashing time. 12 for real use; tests set 4 to stay fast.
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  // Image URLs are built as `${PUBLIC_ASSET_BASE}/${storageKey}`. Mongo stores only the key, so moving files
  // (to R2 in Phase 4, or a new domain later) means changing this one value, never rewriting rows.
  PUBLIC_ASSET_BASE: z.string().min(1).default('/uploads'),
  IMAGE_TTL_HOURS: z.coerce.number().positive().default(12),
  // Local disk storage folder, relative to server/. Tests use their own folder so they never touch your uploads.
  UPLOAD_DIR: z.string().min(1).default('uploads'),
});

const result = schema.safeParse(process.env);

// Fail fast: crash at boot with a clear message instead of failing on the first request that needs the value.
if (!result.success) {
  console.error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  process.exit(1);
}

export const env = result.data;
