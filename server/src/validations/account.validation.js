import { z } from 'zod';

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters long'),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password confirmation is required to delete your account'),
});

