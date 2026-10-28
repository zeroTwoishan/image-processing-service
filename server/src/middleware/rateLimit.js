import { rateLimit } from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';

// 5 requests per minute per IP, for /login and /register.
// A function, not a ready-made limiter: the counters live inside the limiter object, so createApp()
// calls this to get a new one, and every app (and every test) starts from zero.
export const createAuthLimiter = () =>
  rateLimit({
    windowMs: 60_000,
    limit: 5,
    standardHeaders: 'draft-7', // RateLimit-Policy + RateLimit headers on every response
    legacyHeaders: false, // skip the old X-RateLimit-* headers
    // Blocked: hand an ApiError to our errorHandler so the 429 has the usual { error: { code, message } } shape.
    // The library has already set Retry-After by the time this runs.
    handler: (req, res, next) =>
      next(new ApiError(429, 'RATE_LIMITED', 'Too many attempts. Please wait a moment and try again.')),
  });

// 10 transforms per minute per user: each one can cost a second of CPU on a 512 MB server.
// Keyed by user, not IP: it runs after requireAuth, and a whole college network can share one IP.
// Cache hits count too: still a request, and counting everything keeps the limit predictable.
export const createTransformLimiter = () =>
  rateLimit({
    windowMs: 60_000,
    limit: 10,
    keyGenerator: (req) => req.userId,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(new ApiError(429, 'RATE_LIMITED', 'Too many edits in a minute. Please wait a moment and try again.')),
  });
