import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import healthRouter from './routes/health.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

// A fresh app on every call, so each test file gets its own app (and, from Phase 1, fresh rate-limit counters).
export function createApp() {
  const app = express();

  // Middleware runs top to bottom for every request.
  // helmet sets security headers; 'cross-origin' lets the client (another origin) load our images.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors()); // ponytail: open to any origin; Phase 4 locks it to the Vercel URL
  app.use(express.json());

  app.use('/api/health', healthRouter);

  // These two must stay last: nothing above matched, or something above threw.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
