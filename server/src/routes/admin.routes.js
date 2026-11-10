import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
import {
  patchReportSchema,
  reportIdParamSchema,
  getReportsQuerySchema,
} from '../validations/admin.validation.js';
import adminController from '../controllers/admin.controller.js';

const router = express.Router();

// All admin routes strictly require authentication and admin role
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/admin/reports
 * @desc    Get user incident reports (filtered by status)
 * @access  Private (Admin only)
 */
router.get(
  '/reports',
  validate(getReportsQuerySchema, 'query'),
  adminController.getReports
);

/**
 * @route   PATCH /api/admin/reports/:id
 * @desc    Perform moderation action on a report (dismiss, warn, suspend)
 * @access  Private (Admin only)
 */
router.patch(
  '/reports/:id',
  validate(reportIdParamSchema, 'params'),
  validate(patchReportSchema, 'body'),
  adminController.patchReport
);

/**
 * @route   GET /api/admin/stats
 * @desc    Get system-wide platform statistics
 * @access  Private (Admin only)
 */
router.get(
  '/stats',
  adminController.getStats
);

export default router;

