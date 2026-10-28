import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { parseImageUpload } from '../middleware/upload.js';
import { createTransformLimiter } from '../middleware/rateLimit.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { listQuerySchema, renameSchema, transformSchema } from '../utils/schemas.js';
import { uploadImage, listImages, getImage, transformImage, renameImage } from '../controllers/image.js';

// A function, not one shared router: the transform limiter's counters live inside it, so every createApp()
// (and every test) gets its own, starting from zero.
export function createImageRouter() {
  const router = Router();

  // Every /images route needs a logged-in user. It runs before multer, so an anonymous request is rejected
  // before the server reads (and holds in memory) up to 10 MB of its body.
  router.use(requireAuth);

  router.post('/', parseImageUpload, uploadImage);
  router.get('/', validateQuery(listQuerySchema), listImages);
  router.get('/:id', getImage);
  router.patch('/:id', validateBody(renameSchema), renameImage);
  // The limiter comes after requireAuth (it counts per user) and before validation (bad requests count too).
  router.post('/:id/transform', createTransformLimiter(), validateBody(transformSchema), transformImage);

  return router;
}
