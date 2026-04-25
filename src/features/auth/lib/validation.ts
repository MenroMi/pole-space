import { z } from 'zod';

export function applyPasswordComplexity(v: string, ctx: z.RefinementCtx) {
  if (!/[A-Z]/.test(v))
    ctx.addIssue({ code: 'custom', message: 'Must contain at least one uppercase letter' });
  if (!/[a-z]/.test(v))
    ctx.addIssue({ code: 'custom', message: 'Must contain at least one lowercase letter' });
  if (!/[0-9]/.test(v))
    ctx.addIssue({ code: 'custom', message: 'Must contain at least one number' });
  if (!/[^A-Za-z0-9]/.test(v))
    ctx.addIssue({ code: 'custom', message: 'Must contain at least one special character' });
}

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Required'),
});

export const signupSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().trim().min(1, 'Last name is required').max(50, 'Last name is too long'),
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .superRefine(applyPasswordComplexity),
  location: z.string().max(100).optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
