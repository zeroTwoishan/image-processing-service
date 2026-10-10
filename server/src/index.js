import { env } from './config/env.js'; // first import: validates env before anything else runs
import { connectDb, disconnectDb } from './config/db.js';
import { createApp } from './app.js';

try {
  await connectDb(env.MONGO_URI);
} catch (err) {
  // Don't print MONGO_URI: in production it contains the database password.
  console.error(`Could not connect to MongoDB (${err.message}). Is it running? Try: docker compose up -d`);
  process.exit(1);
}

const server = createApp().listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

// Graceful shutdown. SIGTERM comes from Docker/Render when they stop us; SIGINT is Ctrl+C.
function shutdown(signal) {
  console.log(`${signal} received, shutting down...`);
  // Stop accepting new connections; the callback runs once in-flight requests have finished.
  server.close(async () => {
    await disconnectDb();
    process.exit(0);
  });
  // If a request hangs, don't wait forever. unref() stops this timer from keeping the process alive on its own.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
