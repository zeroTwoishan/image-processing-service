import { beforeAll, beforeEach, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../src/config/db.js';

// Call useTestDb() at the top of any test file that needs Mongo.
export function useTestDb() {
  beforeAll(async () => {
    // Safety net: this helper wipes collections, so refuse to run against anything but a test database.
    if (!process.env.MONGO_URI.endsWith('-test')) throw new Error('Tests must use a *-test database');
    await connectDb(process.env.MONGO_URI);
    // Build indexes (like the unique username) before any test relies on them.
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  });

  // Every test starts from empty collections, so tests can't affect each other.
  beforeEach(async () => {
    await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  });

  afterAll(() => disconnectDb());
}
