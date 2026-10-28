import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';

// Controllers only use save / get / remove, so every driver must behave the same way. The same checks run
// against each one.
function storageContract(name, load, options) {
  describe(`${name} storage`, options, () => {
    it('saves, reads back, lists and removes a file; removing it twice is fine', async () => {
      const { default: storage } = await load();
      const key = `contract-test/${randomUUID()}.txt`;
      const bytes = Buffer.from('hello');

      await storage.save(key, bytes, 'text/plain');
      expect((await storage.get(key)).equals(bytes)).toBe(true);
      const listed = (await storage.list()).find((file) => file.key === key);
      expect(listed?.lastModified).toBeInstanceOf(Date); // the orphan sweep needs the key and its age

      await storage.remove(key);
      await storage.remove(key); // the cleanup job may run twice
      await expect(storage.get(key)).rejects.toThrow();
    });
  });
}

storageContract('local', () => import('../src/services/storage/localStorage.js'));

// Talks to the real bucket, so it only runs when the S3_* settings are set (npm run test:bucket reads .env).
storageContract('s3', () => import('../src/services/storage/s3Storage.js'), { skip: !process.env.S3_BUCKET, timeout: 20_000 });
