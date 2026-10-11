import { z } from 'zod';
import { BLOCKED_EMAIL_DOMAINS } from '../config/index.js';

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100).optional(),
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100).optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please provide a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long'),
  })
  .superRefine((data, ctx) => {
    const fullNameValue = data.full_name || data.fullName;
    if (!fullNameValue || fullNameValue.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['full_name'],
        message: 'Full name is required and must be at least 2 characters',
      });
    }

    if (data.email) {
      const domain = data.email.split('@')[1]?.toLowerCase();
      if (domain && BLOCKED_EMAIL_DOMAINS.includes(domain)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: `Public email providers (${domain}) are not allowed. Please register with your official college or university email address.`,
          params: { code: 'EMAIL_DOMAIN_NOT_ALLOWED' },
        });
      }
    }
  })
  .transform((data) => ({
    full_name: (data.full_name || data.fullName || '').trim(),
    email: data.email.toLowerCase().trim(),
    password: data.password,
  }));

export const verifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
});

export const resendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
