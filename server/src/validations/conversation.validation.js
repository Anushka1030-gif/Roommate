import { z } from 'zod';

export const createConversationSchema = z
  .object({
    candidate_user_id: z.any().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.candidate_user_id === undefined ||
      data.candidate_user_id === null ||
      data.candidate_user_id === ''
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['candidate_user_id'],
        message: 'candidate_user_id is required',
        params: { code: 'MISSING_CANDIDATE_ID' },
      });
      return;
    }

    const num = Number(data.candidate_user_id);
    if (isNaN(num) || num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['candidate_user_id'],
        message: 'candidate_user_id must be a positive integer',
        params: { code: 'INVALID_CANDIDATE_ID' },
      });
    }
  })
  .transform((data) => ({
    candidate_user_id: Number(data.candidate_user_id),
  }));

export const sendMessageSchema = z
  .object({
    content: z.any().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.content === undefined ||
      data.content === null ||
      typeof data.content !== 'string' ||
      data.content.trim().length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['content'],
        message: 'Message content cannot be empty',
        params: { code: 'EMPTY_MESSAGE' },
      });
      return;
    }

    if (data.content.trim().length > 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['content'],
        message: 'Message length exceeds maximum 1000 characters',
        params: { code: 'MESSAGE_TOO_LONG' },
      });
    }
  })
  .transform((data) => ({
    content: String(data.content).trim(),
  }));

export default {
  createConversationSchema,
  sendMessageSchema,
};
