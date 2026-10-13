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
