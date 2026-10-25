import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests never touch the dev database, and never need a real secret.
    env: {
      NODE_ENV: 'test',
      MONGO_URI: 'mongodb://localhost:27017/image-processing-test',
      JWT_SECRET: 'test-only-secret-not-used-anywhere-real',
      // Tests check that hashing works, not that it's slow; cost 12 would make the suite flaky on a busy laptop.
      BCRYPT_COST: '4',
      // Test uploads go to their own folder (wiped by the tests), never mixed with your real uploads/.
      UPLOAD_DIR: 'uploads-test',
      // A made-up site, so the CORS tests can check who may call the API.
      CLIENT_ORIGIN: 'http://client.test',
      STORAGE_DRIVER: 'local',
    },
    // Test files share one database and clear it before each test, so run them one at a time.
    fileParallelism: false,
  },
});
