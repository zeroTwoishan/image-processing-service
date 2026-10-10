import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

// Liveness: the process is up and can answer. Says nothing about the database.
router.get('/live', (req, res) => {
  res.json({ status: 'ok' });
});

// Readiness: we can actually serve requests, which means Mongo answers a ping.
router.get('/ready', async (req, res) => {
  try {
    // Throws if we never connected (db is undefined) or Mongo stopped answering.
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

export default router;
