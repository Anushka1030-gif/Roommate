import express from 'express';
import {
  authenticate,
  requireVerified,
} from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
import { createReportSchema } from '../validations/safety.validation.js';
import reportController from '../controllers/report.controller.js';

const router = express.Router();

// Safety report routes require user to be authenticated and have verified email
router.use(authenticate, requireVerified);

/**
 * @route   POST /api/reports
 * @desc    Submit a user incident report
 * @access  Private (Verified)
 */
router.post(
  '/',
  validate(createReportSchema),
  reportController.createReport
);

export default router;

