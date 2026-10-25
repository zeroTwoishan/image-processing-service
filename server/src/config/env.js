import { z } from 'zod';

// URLs pasted from a dashboard often end in "/". Origins never do, and base + "/" + key would give "//".
const noTrailingSlash = (url) => url.replace(/\/+$/, '');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  MONGO_URI: z.string().min(1),
  // Anyone who knows this secret can forge a login token for any user, so it must be long and random.
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  // bcrypt work factor: each +1 doubles the hashing time. 12 for real use; tests set 4 to stay fast.
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  // Image URLs are built as `${PUBLIC_ASSET_BASE}/${storageKey}`. Mongo stores only the key, so moving files
  // (to a bucket in Phase 4, or a new domain later) means changing this one value, never rewriting rows.
  PUBLIC_ASSET_BASE: z.string().min(1).transform(noTrailingSlash).default('/uploads'),
  IMAGE_TTL_HOURS: z.coerce.number().positive().default(12),
  // Local disk storage folder, relative to server/. Tests use their own folder so they never touch your uploads.
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  // Where files live: this machine's disk, or an S3-compatible bucket (Supabase Storage). Render wipes its
  // disk on every deploy, so production uses s3.
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  // Supabase → Project Settings → Storage → S3 connection: endpoint, region, and an access key pair (a secret:
  // it can read and delete every file in the project).
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  // The only site whose JavaScript may call the API from another origin (the Vercel URL in production).
  // Unset in dev: the browser only talks to Vite, which proxies /api, so there is no other origin.
  CLIENT_ORIGIN: z.url().transform(noTrailingSlash).optional(),
}).superRefine((env, ctx) => {
  // Checked here, not on the first upload: a missing storage setting should stop the deploy, not a user's photo.
  if (env.STORAGE_DRIVER === 's3') {
    for (const key of ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
      if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'required when STORAGE_DRIVER=s3' });
    }
    if (env.PUBLIC_ASSET_BASE.startsWith('/')) {
      ctx.addIssue({ code: 'custom', path: ['PUBLIC_ASSET_BASE'], message: "must be the bucket's public URL when STORAGE_DRIVER=s3" });
    }
  }
  // Without it, production would block every request from the real site.
  if (env.NODE_ENV === 'production' && !env.CLIENT_ORIGIN) {
    ctx.addIssue({ code: 'custom', path: ['CLIENT_ORIGIN'], message: 'required in production' });
  }
});

const result = schema.safeParse(process.env);

// Fail fast: crash at boot with a clear message instead of failing on the first request that needs the value.
if (!result.success) {
  console.error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  process.exit(1);
}

export const env = result.data;
