import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { createAuthLimiter } from './middleware/rateLimit.js';

// A fresh app on every call, so each test gets its own app with fresh rate-limit counters.
export function createApp() {
  const app = express();

  // Middleware runs top to bottom for every request.
  // helmet sets security headers; 'cross-origin' lets the client (another origin) load our images.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors()); // ponytail: open to any origin; Phase 4 locks it to the Vercel URL
  app.use(express.json());

  app.use('/api/health', healthRouter);
  // Must run before authRouter. Both paths share one counter: 5 attempts per IP per minute in total.
  app.use(['/api/login', '/api/register'], createAuthLimiter());
  app.use('/api', authRouter);

  // These two must stay last: nothing above matched, or something above threw.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
