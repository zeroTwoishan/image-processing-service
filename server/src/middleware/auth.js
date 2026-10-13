import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Put this in front of any route that needs a logged-in user. Sets req.userId.
export function requireAuth(req, res, next) {
  // "Bearer eyJ..." → ['Bearer', 'eyJ...']
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Missing or malformed Authorization header');
  }

  try {
    // verify (not decode!) checks the signature and the expiry.
    // Pinning the algorithm blocks tokens that claim "alg": "none" (no signature at all).
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    req.userId = payload.sub;
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }

  next(); // outside the try, so errors from later routes aren't reported as "invalid token"
}
