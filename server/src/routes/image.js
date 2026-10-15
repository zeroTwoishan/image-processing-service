import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { parseImageUpload } from '../middleware/upload.js';
import { uploadImage, getImage } from '../controllers/image.js';

const router = Router();

// Every /images route needs a logged-in user. It runs before multer, so an anonymous request is rejected
// before the server reads (and holds in memory) up to 10 MB of its body.
router.use(requireAuth);

router.post('/', parseImageUpload, uploadImage);
router.get('/:id', getImage);

export default router;