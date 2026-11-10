import express from 'express';
import {
  authenticate,
  requireVerified,
} from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
import {
  createBlockSchema,
  blockUserIdParamSchema,
} from '../validations/safety.validation.js';
import blockController from '../controllers/block.controller.js';

const router = express.Router();

// Safety routes require user to be authenticated and have verified email
router.use(authenticate, requireVerified);

/**
 * @route   POST /api/blocks
 * @desc    Block a user
 * @access  Private (Verified)
 */
router.post(
  '/',
  validate(createBlockSchema),
  blockController.blockUser
);

/**
 * @route   DELETE /api/blocks/:userId
 * @desc    Unblock a user
 * @access  Private (Verified)
 */
router.delete(
  '/:userId',
  validate(blockUserIdParamSchema, 'params'),
  blockController.unblockUser
);

/**
 * @route   GET /api/blocks
 * @desc    List all users blocked by the caller (display names only)
 * @access  Private (Verified)
 */
router.get(
  '/',
  blockController.getBlockedUsers
);

export default router;

