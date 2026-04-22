import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Required'),
});

export const signupSchema = z.object({
  name: z.string().min(5, 'Name must be at least 5 characters').max(50, 'Name is too long'),
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .superRefine((v, ctx) => {
      if (!/[A-Z]/.test(v))
        ctx.addIssue({ code: 'custom', message: 'Must contain at least one uppercase letter' });
      if (!/[a-z]/.test(v))
        ctx.addIssue({ code: 'custom', message: 'Must contain at least one lowercase letter' });
      if (!/[0-9]/.test(v))
        ctx.addIssue({ code: 'custom', message: 'Must contain at least one number' });
      if (!/[^A-Za-z0-9]/.test(v))
        ctx.addIssue({ code: 'custom', message: 'Must contain at least one special character' });
    }),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
