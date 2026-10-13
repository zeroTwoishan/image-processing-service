import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { credentialsSchema } from '../utils/schemas.js';
import { requireAuth } from '../middleware/auth.js';
import { register, login, me } from '../controllers/auth.js';

const router = Router();

// Each route is a small pipeline: validate the body, then run the controller.
router.post('/register', validateBody(credentialsSchema), register);
router.post('/login', validateBody(credentialsSchema), login);
router.get('/me', requireAuth, me);

export default router;
