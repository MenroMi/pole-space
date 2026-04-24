import { z } from 'zod';

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Last name is too long'),
  location: z.string().max(100).nullable().optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

// Narrower schema for the settings form — location is read-only there and never submitted
export const profileNameSchema = profileSchema.pick({ firstName: true, lastName: true });
export type ProfileNameFormValues = z.infer<typeof profileNameSchema>;
