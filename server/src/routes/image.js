import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { parseImageUpload } from '../middleware/upload.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { listQuerySchema, renameSchema, transformSchema } from '../utils/schemas.js';
import { uploadImage, listImages, getImage, transformImage, renameImage } from '../controllers/image.js';

const router = Router();

// Every /images route needs a logged-in user. It runs before multer, so an anonymous request is rejected
// before the server reads (and holds in memory) up to 10 MB of its body.
router.use(requireAuth);

router.post('/', parseImageUpload, uploadImage);
router.get('/', validateQuery(listQuerySchema), listImages);
router.get('/:id', getImage);
router.patch('/:id', validateBody(renameSchema), renameImage);
router.post('/:id/transform', validateBody(transformSchema), transformImage);

export default router;