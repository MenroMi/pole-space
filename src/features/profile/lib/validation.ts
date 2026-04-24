import { z } from 'zod';

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Last name is too long'),
  location: z.string().max(100).nullable().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
