import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import imageRouter from './routes/image.js';
import { storage } from './services/storage/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { createAuthLimiter } from './middleware/rateLimit.js';

// A fresh app on every call, so each test gets its own app with fresh rate-limit counters.
export function createApp() {
  const app = express();

  // In production we sit behind Render's proxy, so every request arrives from the proxy's IP. Trusting one hop
  // makes req.ip the real visitor (from X-Forwarded-For); without it, all users share one rate-limit counter.
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

  // Middleware runs top to bottom for every request.
  // helmet sets security headers; 'cross-origin' lets the client (another origin) load our images.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      // Only our own site's JavaScript may read API responses from another origin (false: no CORS headers in dev).
      origin: env.CLIENT_ORIGIN ?? false,
      // Cross-origin, the browser hides all but a few basic headers from JavaScript. The rate-limit countdown reads these.
      exposedHeaders: ['Retry-After', 'RateLimit', 'RateLimit-Policy'],
    }),
  );
  app.use(express.json());

  app.use('/api/health', healthRouter);
  // Must run before authRouter. Both paths share one counter: 5 attempts per IP per minute in total.
  app.use(['/api/login', '/api/register'], createAuthLimiter());
  app.use('/api', authRouter);
  app.use('/api/images', imageRouter);

  // Uploaded files, served straight from disk. Public on purpose: an <img> tag can't send our JWT, so the
  // random UUID in each URL is what keeps them private. A key is never reused for different bytes, so
  // browsers may cache each file for a year without checking back (immutable). With s3 the bucket serves them.
  if (env.STORAGE_DRIVER === 'local') {
    app.use('/uploads', express.static(storage.root, { index: false, immutable: true, maxAge: '1y' }));
  }

  // These two must stay last: nothing above matched, or something above threw.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
