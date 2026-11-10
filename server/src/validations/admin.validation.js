import { z } from 'zod';

export const patchReportSchema = z.object({
  action: z.enum(['dismiss', 'warn', 'suspend'], {
    errorMap: () => ({ message: 'Action must be one of: dismiss, warn, suspend' }),
  }),
  note: z
    .string()
    .trim()
    .max(1000, 'Admin note cannot exceed 1000 characters')
    .optional()
    .nullable()
    .or(z.literal('')),
});

export const reportIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int('Report ID must be an integer')
    .positive('Report ID must be a positive number'),
});

export const getReportsQuerySchema = z.object({
  status: z.enum(['open', 'pending', 'reviewed', 'resolved', 'dismissed', 'all']).optional(),
});

