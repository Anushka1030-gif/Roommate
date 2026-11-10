import { Router } from 'express';
import { authenticate, requireVerified } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
import { updatePhoneSchema } from '../validations/profile.validation.js';
import { changePasswordSchema, deleteAccountSchema } from '../validations/account.validation.js';
import { changePasswordLimiter, deleteAccountLimiter } from '../middleware/rateLimiter.js';
import accountController from '../controllers/account.controller.js';

const router = Router();

// Update user contact phone number (optional)
router.put(
  '/phone',
  authenticate,
  requireVerified,
  validate(updatePhoneSchema),
  accountController.updatePhone
);

// Change user password
router.post(
  '/change-password',
  authenticate,
  changePasswordLimiter,
  validate(changePasswordSchema),
  accountController.changePassword
);

// Anonymize and delete user account
router.delete(
  '/',
  authenticate,
  deleteAccountLimiter,
  validate(deleteAccountSchema),
  accountController.deleteAccount
);

export default router;
