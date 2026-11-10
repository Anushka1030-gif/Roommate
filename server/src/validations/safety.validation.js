import { z } from 'zod';

export const REPORT_REASONS = [
  'harassment',
  'fake_profile',
  'inappropriate_content',
  'spam',
  'other',
];

export const createBlockSchema = z.object({
  blocked_user_id: z.coerce
    .number()
    .int('blocked_user_id must be an integer')
    .positive('blocked_user_id must be a valid positive user ID'),
  reason: z.string().max(255, 'Reason cannot exceed 255 characters').optional().nullable(),
});

export const blockUserIdParamSchema = z.object({
  userId: z.coerce
    .number()
    .int('userId must be an integer')
    .positive('userId must be a valid positive user ID'),
});

export const createReportSchema = z.object({
  reported_user_id: z.coerce
    .number()
    .int('reported_user_id must be an integer')
    .positive('reported_user_id must be a valid positive user ID'),
  reason: z.enum(REPORT_REASONS, {
    errorMap: () => ({ message: `Reason must be one of: ${REPORT_REASONS.join(', ')}` }),
  }),
  details: z
    .string()
    .trim()
    .max(500, 'Details cannot exceed 500 characters')
    .optional()
    .nullable()
    .or(z.literal('')),
});

