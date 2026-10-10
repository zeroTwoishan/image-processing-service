import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests never touch the dev database, and never need a real secret.
    env: {
      NODE_ENV: 'test',
      MONGO_URI: 'mongodb://localhost:27017/image-processing-test',
      JWT_SECRET: 'test-only-secret-not-used-anywhere-real',
    },
  },
});
