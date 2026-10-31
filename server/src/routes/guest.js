import { Router } from 'express';
import { parseImageUpload } from '../middleware/upload.js';
import { createGuestLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { transformSchema } from '../utils/schemas.js';
import { guestTransform } from '../controllers/guest.js';
import { ApiError } from '../utils/ApiError.js';

// A multipart form carries text fields as plain strings, so the edits arrive as a JSON string next to the file.
// Parse it here; validateBody(transformSchema) then checks it exactly like a logged-in transform.
function parseTransformations(req, res, next) {
  try {
    req.body = { transformations: JSON.parse(req.body.transformations) };
  } catch {
    throw new ApiError(400, 'VALIDATION_FAILED', 'Send the edits as JSON in the "transformations" field');
  }
  next();
}

// A function, like createImageRouter: every createApp() (and every test) gets fresh guest counters.
export function createGuestRouter() {
  const router = Router();
  // The limiter runs first, so a blocked visitor is turned away before the server reads up to 10 MB of upload.
  router.post('/transform', createGuestLimiter(), parseImageUpload, parseTransformations, validateBody(transformSchema), guestTransform);
  return router;
}
