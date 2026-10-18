import express from 'express';
import {
  authenticate,
  requireVerified,
  requireCompleteProfile,
} from '../middleware/auth.middleware.js';
import { matchesRefreshLimiter } from '../middleware/rateLimiter.js';
import matchController from '../controllers/match.controller.js';

const router = express.Router();

/**
 * @route   GET /api/matches
 * @desc    Get top matches for the authenticated student's active requirement
 * @access  Private (Verified + Complete Profile)
 */
router.get(
  '/',
  authenticate,
  requireVerified,
  requireCompleteProfile,
  matchController.getMatches
);

/**
 * @route   POST /api/matches/refresh
 * @desc    Force re-evaluation of matches (rate limited to 5/day)
 * @access  Private (Verified + Complete Profile)
 */
router.post(
  '/refresh',
  authenticate,
  requireVerified,
  requireCompleteProfile,
  matchesRefreshLimiter,
  matchController.refreshMatches
);

export default router;
