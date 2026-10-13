import { Router } from 'express';
import { authenticate, requireVerified } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
import { putProfileSchema } from '../validations/profile.validation.js';
import profileController from '../controllers/profile.controller.js';

const router = Router();

router.get('/me', authenticate, requireVerified, profileController.getMe);
router.put('/me', authenticate, requireVerified, validate(putProfileSchema), profileController.updateMe);

export default router;
