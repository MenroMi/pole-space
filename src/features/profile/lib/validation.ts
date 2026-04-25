import { z } from 'zod';

import { applyPasswordComplexity } from '@/features/auth/lib/validation';

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Last name is too long'),
  location: z.string().max(100).nullable().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

// Narrower schema for the settings form — location is read-only there and never submitted
export const profileNameSchema = profileSchema.pick({ firstName: true, lastName: true });
export type ProfileNameFormValues = z.infer<typeof profileNameSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100)
      .superRefine(applyPasswordComplexity),
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
