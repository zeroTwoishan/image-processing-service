// The only place that decides where files live. Controllers import `storage` from here and call
// save / get / remove; they never know whether it's local disk or a bucket.
import { env } from '../../config/env.js';

// Only the chosen driver is loaded, so dev never builds an S3 client it has no settings for.
export const storage = (await import(env.STORAGE_DRIVER === 's3' ? './s3Storage.js' : './localStorage.js')).default;
