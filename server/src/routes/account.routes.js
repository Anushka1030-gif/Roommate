import { Router } from 'express';
import { authenticate, requireVerified } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
import { updatePhoneSchema } from '../validations/profile.validation.js';
import accountController from '../controllers/account.controller.js';

const router = Router();

router.put('/phone', authenticate, requireVerified, validate(updatePhoneSchema), accountController.updatePhone);

export default router;
