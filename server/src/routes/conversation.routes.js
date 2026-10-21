import express from 'express';
import {
  authenticate,
  requireVerified,
  requireCompleteProfile,
} from '../middleware/auth.middleware.js';
import { messageSendLimiter } from '../middleware/rateLimiter.js';
import validate from '../middleware/validate.js';
import {
  createConversationSchema,
  sendMessageSchema,
} from '../validations/conversation.validation.js';
import conversationController from '../controllers/conversation.controller.js';

const router = express.Router();

// All conversation and chat routes require authentication, verified email, and complete profile
router.use(authenticate, requireVerified, requireCompleteProfile);

/**
 * @route   POST /api/conversations
 * @desc    Create a new 1-on-1 conversation or return existing conversation
 * @access  Private (Verified + Complete Profile)
 */
router.post(
  '/',
  validate(createConversationSchema),
  conversationController.createConversation
);

/**
 * @route   GET /api/conversations
 * @desc    Get user's conversations inbox with latest message and unread count
 * @access  Private (Verified + Complete Profile)
 */
router.get('/', conversationController.getConversations);

/**
 * @route   GET /api/conversations/:id/messages
 * @desc    Get paginated chat messages for a conversation
 * @access  Private (Verified + Complete Profile)
 */
router.get('/:id/messages', conversationController.getMessages);

/**
 * @route   POST /api/conversations/:id/messages
 * @desc    Send a new message in a conversation (max 1000 chars)
 * @access  Private (Verified + Complete Profile)
 */
router.post(
  '/:id/messages',
  messageSendLimiter,
  validate(sendMessageSchema),
  conversationController.sendMessage
);

/**
 * @route   POST /api/conversations/:id/read
 * @desc    Mark incoming messages in a conversation as read
 * @access  Private (Verified + Complete Profile)
 */
router.post('/:id/read', conversationController.markAsRead);

export default router;
