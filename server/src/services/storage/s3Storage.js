import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from '../../config/env.js';

// Supabase Storage speaks the S3 API, so the AWS SDK works with it: only the endpoint and keys change.
const client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  // Supabase only understands ".../s3/<bucket>/<key>" addresses, not "<bucket>.host/<key>".
  forcePathStyle: true,
  // Newer SDKs add extra checksum headers by default that many S3-compatible services reject; send them only
  // when an operation truly needs them (the SDK's older behaviour).
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});
const Bucket = env.S3_BUCKET;

// Files in an S3-compatible bucket. Same three methods as localStorage.js, so nothing else changes.
export default {
  // The bucket serves files with whatever type they were stored with. A key is never reused for different
  // bytes, so browsers may cache each file for a year (same as the local static server).
  async save(key, buffer, contentType) {
    await client.send(
      new PutObjectCommand({ Bucket, Key: key, Body: buffer, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }),
    );
  },

  async get(key) {
    const { Body } = await client.send(new GetObjectCommand({ Bucket, Key: key }));
    return Buffer.from(await Body.transformToByteArray());
  },

  // Deleting a key that doesn't exist succeeds in S3, so cleanup can safely run twice (like force: true locally).
  async remove(key) {
    await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
  },
};
