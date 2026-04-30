# Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow credentials users to reset their forgotten password via a single-use email link, without leaking whether an email is registered.

**Architecture:** `PasswordResetToken` Prisma model stores one UUID token per email (1h TTL). `forgotPasswordAction` silently creates the token and sends an email. `resetPasswordAction` validates the token server-side, updates the password, and deletes the token. Two new `(auth)` pages handle the two-step UI. `LoginForm` shows a success banner on `?reset=true`.

**Tech Stack:** Next.js 16 App Router, Prisma 7, bcryptjs, Resend, React Hook Form + Zod, Vitest + RTL.

---

## File Map

| File                                                         | Status | Role                                                   |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------ |
| `prisma/schema.prisma`                                       | Modify | Add `PasswordResetToken` model                         |
| `src/features/auth/lib/reset-tokens.ts`                      | Create | Token CRUD: generate, find, delete, deleteByEmail      |
| `src/features/auth/lib/reset-tokens.test.ts`                 | Create | Unit tests for token functions                         |
| `src/features/auth/lib/reset-email.ts`                       | Create | `sendPasswordResetEmail` via Resend                    |
| `src/features/auth/lib/reset-email.test.ts`                  | Create | Unit test for email sending                            |
| `src/features/auth/actions.ts`                               | Modify | Add `forgotPasswordAction`, `resetPasswordAction`      |
| `src/features/auth/actions.test.ts`                          | Modify | Tests for both new actions                             |
| `src/app/(auth)/forgot-password/page.tsx`                    | Create | RSC — reads searchParams, renders `ForgotPasswordForm` |
| `src/app/(auth)/forgot-password/ForgotPasswordForm.tsx`      | Create | Client form: email input, sent/expired states          |
| `src/app/(auth)/forgot-password/ForgotPasswordForm.test.tsx` | Create | Component tests                                        |
| `src/app/(auth)/reset-password/page.tsx`                     | Create | RSC — validates token, redirects if invalid/expired    |
| `src/app/(auth)/reset-password/ResetPasswordForm.tsx`        | Create | Client form: new password + confirm                    |
| `src/app/(auth)/reset-password/ResetPasswordForm.test.tsx`   | Create | Component tests                                        |
| `src/features/auth/components/LoginForm.tsx`                 | Modify | Add `useSearchParams` reset banner on `?reset=true`    |
| `src/features/auth/components/LoginForm.test.tsx`            | Modify | Add test for reset banner                              |

---

## Task 1: Prisma migration — add `PasswordResetToken`

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add model to schema**

Append after the `VerificationToken` model in `prisma/schema.prisma`:

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_password_reset_token 2>&1 | tail -10
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 3: Verify Prisma client regenerated**

```bash
npx tsc --noEmit 2>&1; echo "EXIT: $?"
```

Expected: `EXIT: 0`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(password-reset): add PasswordResetToken Prisma model"
```

---

## Task 2: `reset-tokens.ts` + tests

**Files:**

- Create: `src/features/auth/lib/reset-tokens.ts`
- Create: `src/features/auth/lib/reset-tokens.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/features/auth/lib/reset-tokens.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    passwordResetToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/shared/lib/prisma';
import {
  generateResetToken,
  findResetToken,
  deleteResetToken,
  deleteResetTokensByEmail,
} from './reset-tokens';

const mockCreate = prisma.passwordResetToken.create as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.passwordResetToken.findUnique as ReturnType<typeof vi.fn>;
const mockDelete = prisma.passwordResetToken.delete as ReturnType<typeof vi.fn>;
const mockDeleteMany = prisma.passwordResetToken.deleteMany as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('generateResetToken', () => {
  it('returns a UUID string', async () => {
    mockCreate.mockResolvedValue({});
    const token = await generateResetToken('user@example.com');
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('creates record with correct email and 1h TTL', async () => {
    mockCreate.mockResolvedValue({});
    const before = Date.now();
    await generateResetToken('user@example.com');
    const after = Date.now();

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'user@example.com',
          token: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      }),
    );
    const expiresAt: Date = mockCreate.mock.calls[0][0].data.expiresAt;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 60 * 60 * 1000 - 100);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + 60 * 60 * 1000 + 100);
  });
});

describe('findResetToken', () => {
  it('returns token record when found and not expired', async () => {
    const record = {
      id: '1',
      email: 'user@example.com',
      token: 'abc',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    };
    mockFindUnique.mockResolvedValue(record);
    const result = await findResetToken('abc');
    expect(result).toEqual(record);
  });

  it('returns null when token not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await findResetToken('missing');
    expect(result).toBeNull();
  });
});

describe('deleteResetToken', () => {
  it('deletes by token string', async () => {
    mockDelete.mockResolvedValue({});
    await deleteResetToken('abc');
    expect(mockDelete).toHaveBeenCalledWith({ where: { token: 'abc' } });
  });
});

describe('deleteResetTokensByEmail', () => {
  it('deletes all tokens for an email', async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });
    await deleteResetTokensByEmail('user@example.com');
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { email: 'user@example.com' } });
  });
});
```

- [ ] **Step 2: Run to confirm all tests fail**

```bash
npx vitest run src/features/auth/lib/reset-tokens.test.ts 2>&1 | tail -5
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `reset-tokens.ts`**

Create `src/features/auth/lib/reset-tokens.ts`:

```ts
import crypto from 'crypto';

import { prisma } from '@/shared/lib/prisma';

export async function generateResetToken(email: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({ data: { email, token, expiresAt } });
  return token;
}

export async function findResetToken(token: string) {
  return prisma.passwordResetToken.findUnique({ where: { token } });
}

export async function deleteResetToken(token: string): Promise<void> {
  await prisma.passwordResetToken.delete({ where: { token } });
}

export async function deleteResetTokensByEmail(email: string): Promise<void> {
  await prisma.passwordResetToken.deleteMany({ where: { email } });
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/features/auth/lib/reset-tokens.test.ts --reporter=verbose 2>&1 | tail -12
```

Expected: 5 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/lib/reset-tokens.ts src/features/auth/lib/reset-tokens.test.ts
git commit -m "feat(password-reset): add reset token CRUD helpers"
```

---

## Task 3: `reset-email.ts` + tests

**Files:**

- Create: `src/features/auth/lib/reset-email.ts`
- Create: `src/features/auth/lib/reset-email.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/features/auth/lib/reset-email.test.ts`:

```ts
import * as resendModule from 'resend';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('resend', () => {
  const mockSend = vi.fn();
  return {
    Resend: class {
      emails = { send: mockSend };
    },
    __mockSend: mockSend,
  };
});

import { sendPasswordResetEmail } from './reset-email';

const mockSend = (resendModule as unknown as { __mockSend: Mock }).__mockSend;

beforeEach(() => mockSend.mockClear());

describe('sendPasswordResetEmail', () => {
  it('calls Resend with correct to, subject, and token URL', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });

    await sendPasswordResetEmail('user@example.com', 'test-token-123');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: expect.stringContaining('reset'),
        html: expect.stringContaining('test-token-123'),
      }),
    );
  });

  it('throws if Resend returns an error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'API error' } });

    await expect(sendPasswordResetEmail('user@example.com', 'token')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run src/features/auth/lib/reset-email.test.ts 2>&1 | tail -5
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `reset-email.ts`**

Create `src/features/auth/lib/reset-email.ts`:

```ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM ?? 'onboarding@resend.dev';

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const resetUrl = `${base}/reset-password?token=${token}`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your password — Pole Space',
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. The link expires in 1 hour.</p><p>If you didn't request this, ignore this email.</p>`,
  });

  if (error) {
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/features/auth/lib/reset-email.test.ts --reporter=verbose 2>&1 | tail -8
```

Expected: 2 passing tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/lib/reset-email.ts src/features/auth/lib/reset-email.test.ts
git commit -m "feat(password-reset): add sendPasswordResetEmail helper"
```

---

## Task 4: `forgotPasswordAction` + `resetPasswordAction` + tests

**Files:**

- Modify: `src/features/auth/actions.ts`
- Modify: `src/features/auth/actions.test.ts`

- [ ] **Step 1: Add failing tests**

In `src/features/auth/actions.test.ts`, extend the existing mocks and add new describe blocks.

First, update the `vi.mock('@/shared/lib/prisma', ...)` mock to include `passwordResetToken`:

```ts
vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    verificationToken: {
      findFirst: vi.fn(),
    },
    passwordResetToken: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));
```

Add mocks for the new helpers after existing mock imports:

```ts
vi.mock('@/features/auth/lib/reset-tokens', () => ({
  generateResetToken: vi.fn().mockResolvedValue('reset-token-uuid'),
  deleteResetTokensByEmail: vi.fn(),
  findResetToken: vi.fn(),
  deleteResetToken: vi.fn(),
}));
vi.mock('@/features/auth/lib/reset-email', () => ({
  sendPasswordResetEmail: vi.fn(),
}));
```

Add imports after the existing import block:

```ts
import {
  generateResetToken,
  deleteResetTokensByEmail,
  findResetToken,
  deleteResetToken,
} from '@/features/auth/lib/reset-tokens';
import { sendPasswordResetEmail } from '@/features/auth/lib/reset-email';
import { forgotPasswordAction, resetPasswordAction } from './actions';
```

Add typed mock variables after existing ones:

```ts
const mockGenResetToken = generateResetToken as ReturnType<typeof vi.fn>;
const mockDeleteResetTokensByEmail = deleteResetTokensByEmail as ReturnType<typeof vi.fn>;
const mockFindResetToken = findResetToken as ReturnType<typeof vi.fn>;
const mockDeleteResetToken = deleteResetToken as ReturnType<typeof vi.fn>;
const mockSendResetEmail = sendPasswordResetEmail as ReturnType<typeof vi.fn>;
const mockUserUpdate = prisma.user.update as ReturnType<typeof vi.fn>;
```

Add new describe blocks at the end of the file:

```ts
describe('forgotPasswordAction', () => {
  it('returns { sent: true } and does nothing when email not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await forgotPasswordAction('nobody@example.com');

    expect(result).toEqual({ sent: true });
    expect(mockGenResetToken).not.toHaveBeenCalled();
    expect(mockSendResetEmail).not.toHaveBeenCalled();
  });

  it('returns { sent: true } and does nothing for OAuth user (no password)', async () => {
    mockFindUnique.mockResolvedValue({ id: 'u1', password: null });

    const result = await forgotPasswordAction('oauth@example.com');

    expect(result).toEqual({ sent: true });
    expect(mockGenResetToken).not.toHaveBeenCalled();
  });

  it('deletes old tokens, generates new token, sends email, returns { sent: true }', async () => {
    mockFindUnique.mockResolvedValue({ id: 'u1', password: 'hashed' });
    mockSendResetEmail.mockResolvedValue(undefined);

    const result = await forgotPasswordAction('user@example.com');

    expect(mockDeleteResetTokensByEmail).toHaveBeenCalledWith('user@example.com');
    expect(mockGenResetToken).toHaveBeenCalledWith('user@example.com');
    expect(mockSendResetEmail).toHaveBeenCalledWith('user@example.com', 'reset-token-uuid');
    expect(result).toEqual({ sent: true });
  });

  it('returns { sent: true } even when email sending fails', async () => {
    mockFindUnique.mockResolvedValue({ id: 'u1', password: 'hashed' });
    mockSendResetEmail.mockRejectedValue(new Error('Resend down'));

    const result = await forgotPasswordAction('user@example.com');

    expect(result).toEqual({ sent: true });
  });

  it('returns error for invalid email format', async () => {
    const result = await forgotPasswordAction('not-an-email');
    expect(result).toEqual({ error: 'Invalid email' });
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});

describe('resetPasswordAction', () => {
  it('returns { error: "invalid" } when token not found', async () => {
    mockFindResetToken.mockResolvedValue(null);

    const result = await resetPasswordAction('missing-token', 'NewPass1!');

    expect(result).toEqual({ error: 'invalid' });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('returns { error: "expired" } when token is expired', async () => {
    mockFindResetToken.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      token: 'old-token',
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await resetPasswordAction('old-token', 'NewPass1!');

    expect(result).toEqual({ error: 'expired' });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('returns error for invalid password (fails complexity)', async () => {
    mockFindResetToken.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      token: 'valid-token',
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await resetPasswordAction('valid-token', 'weakpassword');

    expect(result).toEqual({ error: 'Invalid password' });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('updates password, deletes token, returns { success: true } on valid input', async () => {
    mockFindResetToken.mockResolvedValue({
      id: '1',
      email: 'user@example.com',
      token: 'valid-token',
      expiresAt: new Date(Date.now() + 60_000),
    });
    mockUserUpdate.mockResolvedValue({});

    const result = await resetPasswordAction('valid-token', 'NewPass1!');

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
      data: { password: 'hashed_pw' },
    });
    expect(mockDeleteResetToken).toHaveBeenCalledWith('valid-token');
    expect(result).toEqual({ success: true });
  });
});
```

- [ ] **Step 2: Run to confirm new tests fail**

```bash
npx vitest run src/features/auth/actions.test.ts 2>&1 | tail -10
```

Expected: existing tests pass, new `forgotPasswordAction` / `resetPasswordAction` tests fail.

- [ ] **Step 3: Implement actions**

In `src/features/auth/actions.ts`, add imports at the top:

```ts
import { z } from 'zod';
import bcrypt from 'bcryptjs'; // already imported
import { applyPasswordComplexity } from './lib/validation';
import {
  generateResetToken,
  deleteResetTokensByEmail,
  findResetToken,
  deleteResetToken,
} from './lib/reset-tokens';
import { sendPasswordResetEmail } from './lib/reset-email';
```

Note: `bcrypt` is already imported. Add only the new imports. Then add the two new functions at the bottom of the file:

```ts
const forgotPasswordSchema = z.object({ email: z.string().email() });

const resetPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100)
  .superRefine(applyPasswordComplexity);

export async function forgotPasswordAction(
  email: string,
): Promise<{ sent: true } | { error: string }> {
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) return { error: 'Invalid email' };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, password: true },
  });

  if (!user || user.password === null) return { sent: true };

  await deleteResetTokensByEmail(email);
  const token = await generateResetToken(email);

  try {
    await sendPasswordResetEmail(email, token);
  } catch {
    // fire-and-forget: don't surface email failures to prevent user enumeration
  }

  return { sent: true };
}

export async function resetPasswordAction(
  token: string,
  newPassword: string,
): Promise<{ success: true } | { error: string }> {
  const passwordResult = resetPasswordSchema.safeParse(newPassword);
  if (!passwordResult.success) return { error: 'Invalid password' };

  const record = await findResetToken(token);
  if (!record) return { error: 'invalid' };
  if (record.expiresAt < new Date()) return { error: 'expired' };

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { email: record.email }, data: { password: hashed } });
  await deleteResetToken(token);

  return { success: true };
}
```

- [ ] **Step 4: Run all action tests — expect pass**

```bash
npx vitest run src/features/auth/actions.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit 2>&1; echo "EXIT: $?"
```

Expected: `EXIT: 0`

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/actions.ts src/features/auth/actions.test.ts
git commit -m "feat(password-reset): add forgotPasswordAction and resetPasswordAction"
```

---

## Task 5: `/forgot-password` page + `ForgotPasswordForm`

**Files:**

- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/app/(auth)/forgot-password/ForgotPasswordForm.tsx`
- Create: `src/app/(auth)/forgot-password/ForgotPasswordForm.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/app/(auth)/forgot-password/ForgotPasswordForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/auth/actions', () => ({
  forgotPasswordAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { forgotPasswordAction } from '@/features/auth/actions';
import ForgotPasswordForm from './ForgotPasswordForm';

const mockAction = forgotPasswordAction as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('ForgotPasswordForm', () => {
  it('renders the email form by default', () => {
    render(<ForgotPasswordForm sent={false} expired={false} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('shows confirmation panel when sent=true', () => {
    render(<ForgotPasswordForm sent={true} expired={false} />);
    expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /send reset link/i })).not.toBeInTheDocument();
  });

  it('shows expired notice above form when expired=true', () => {
    render(<ForgotPasswordForm sent={false} expired={true} />);
    expect(screen.getByText(/link has expired/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('calls forgotPasswordAction with email on submit', async () => {
    mockAction.mockResolvedValue({ sent: true });
    const user = userEvent.setup();
    render(<ForgotPasswordForm sent={false} expired={false} />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(mockAction).toHaveBeenCalledWith('user@example.com');
  });
});
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run "src/app/\(auth\)/forgot-password/ForgotPasswordForm.test.tsx" 2>&1 | tail -5
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `ForgotPasswordForm.tsx`**

Create `src/app/(auth)/forgot-password/ForgotPasswordForm.tsx`:

```tsx
'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { forgotPasswordAction } from '@/features/auth/actions';

const schema = z.object({ email: z.string().email('Please enter a valid email') });
type FormData = z.infer<typeof schema>;

type ForgotPasswordFormProps = {
  sent: boolean;
  expired: boolean;
};

export default function ForgotPasswordForm({ sent, expired }: ForgotPasswordFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    await forgotPasswordAction(data.email);
    router.push('/forgot-password?sent=true');
  };

  if (sent) {
    return (
      <div className="w-full max-w-sm animate-fade-in-up space-y-10">
        <div className="space-y-1.5">
          <h2 className="font-display text-4xl font-light tracking-tight text-on-surface lowercase">
            check your inbox.
          </h2>
          <p className="text-sm leading-relaxed text-on-surface-variant">
            if that address is registered, a reset link is on its way. it expires in 1 hour.
          </p>
        </div>
        <Link
          href="/login"
          className="block text-center text-xs text-on-surface-variant transition-colors duration-200 hover:text-on-surface"
        >
          back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm animate-fade-in-up space-y-10">
      <div className="space-y-1.5">
        <h2 className="font-display text-4xl font-light tracking-tight text-on-surface lowercase">
          forgot password.
        </h2>
        <p className="text-sm text-on-surface-variant">
          enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {expired && (
        <p role="alert" className="text-sm text-red-400">
          that link has expired — enter your email to get a new one.
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="group">
          <label
            htmlFor="email"
            className="mb-1 block text-[10px] font-medium tracking-widest text-outline-variant uppercase transition-colors duration-200 group-focus-within:text-primary"
          >
            email address
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              placeholder="performer@polespace.com"
              className="w-full border-b border-outline-variant bg-transparent px-0 py-3 text-on-surface placeholder:text-outline-variant/40 focus:outline-none"
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            <div className="pointer-events-none absolute bottom-0 left-0 h-[1.5px] w-full origin-center scale-x-0 bg-primary transition-transform duration-300 group-focus-within:scale-x-100" />
          </div>
          {errors.email && (
            <p
              id="email-error"
              role="alert"
              className="mt-1.5 text-xs tracking-wide text-red-400/80"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="kinetic-gradient w-full cursor-pointer rounded-md py-4 text-xs font-bold tracking-widest text-on-primary uppercase shadow-[0_4px_16px_-2px_rgba(132,88,179,0.4)] hover:scale-[1.01] hover:shadow-[0_6px_20px_-2px_rgba(220,184,255,0.5)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          {isSubmitting ? 'sending...' : 'send reset link'}
        </button>
      </form>

      <Link
        href="/login"
        className="block text-center text-xs text-on-surface-variant transition-colors duration-200 hover:text-on-surface"
      >
        back to sign in
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Create `page.tsx`**

Create `src/app/(auth)/forgot-password/page.tsx`:

```tsx
import ForgotPasswordForm from './ForgotPasswordForm';

type Props = {
  searchParams: Promise<{ sent?: string; expired?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const { sent, expired } = await searchParams;
  return <ForgotPasswordForm sent={!!sent} expired={!!expired} />;
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run "src/app/\(auth\)/forgot-password/ForgotPasswordForm.test.tsx" --reporter=verbose 2>&1 | tail -10
```

Expected: 4 passing tests.

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit 2>&1; echo "EXIT: $?"
```

Expected: `EXIT: 0`

- [ ] **Step 7: Commit**

```bash
git add "src/app/(auth)/forgot-password/"
git commit -m "feat(password-reset): add /forgot-password page and form"
```

---

## Task 6: `/reset-password` page + `ResetPasswordForm`

**Files:**

- Create: `src/app/(auth)/reset-password/page.tsx`
- Create: `src/app/(auth)/reset-password/ResetPasswordForm.tsx`
- Create: `src/app/(auth)/reset-password/ResetPasswordForm.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/app/(auth)/reset-password/ResetPasswordForm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/auth/actions', () => ({
  resetPasswordAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

import { resetPasswordAction } from '@/features/auth/actions';
import ResetPasswordForm from './ResetPasswordForm';

const mockAction = resetPasswordAction as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('ResetPasswordForm', () => {
  it('renders new password and confirm password fields', () => {
    render(<ResetPasswordForm token="valid-token" />);
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('shows mismatch error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm token="valid-token" />);

    await user.type(screen.getByLabelText(/new password/i), 'NewPass1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Different1!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockAction).not.toHaveBeenCalled();
  });

  it('calls resetPasswordAction with token and password on valid submit', async () => {
    mockAction.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<ResetPasswordForm token="valid-token" />);

    await user.type(screen.getByLabelText(/new password/i), 'NewPass1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(mockAction).toHaveBeenCalledWith('valid-token', 'NewPass1!');
  });

  it('shows expired message when action returns { error: "expired" }', async () => {
    mockAction.mockResolvedValue({ error: 'expired' });
    const user = userEvent.setup();
    render(<ResetPasswordForm token="valid-token" />);

    await user.type(screen.getByLabelText(/new password/i), 'NewPass1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/link has expired/i)).toBeInTheDocument();
  });

  it('shows invalid message when action returns { error: "invalid" }', async () => {
    mockAction.mockResolvedValue({ error: 'invalid' });
    const user = userEvent.setup();
    render(<ResetPasswordForm token="valid-token" />);

    await user.type(screen.getByLabelText(/new password/i), 'NewPass1!');
    await user.type(screen.getByLabelText(/confirm password/i), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/invalid or already used/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx vitest run "src/app/\(auth\)/reset-password/ResetPasswordForm.test.tsx" 2>&1 | tail -5
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `ResetPasswordForm.tsx`**

Create `src/app/(auth)/reset-password/ResetPasswordForm.tsx`:

```tsx
'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { resetPasswordAction } from '@/features/auth/actions';
import { PasswordInput } from '@/shared/components/PasswordInput';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100)
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [actionError, setActionError] = useState<'expired' | 'invalid' | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setActionError(null);
    const result = await resetPasswordAction(token, data.password);
    if ('error' in result) {
      setActionError(result.error as 'expired' | 'invalid');
      return;
    }
    router.push('/login?reset=true');
  };

  return (
    <div className="w-full max-w-sm animate-fade-in-up space-y-10">
      <div className="space-y-1.5">
        <h2 className="font-display text-4xl font-light tracking-tight text-on-surface lowercase">
          new password.
        </h2>
        <p className="text-sm text-on-surface-variant">
          choose a strong password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-6">
          <div className="group">
            <label
              htmlFor="password"
              className="mb-1 block text-[10px] font-medium tracking-widest text-outline-variant uppercase transition-colors duration-200 group-focus-within:text-primary"
            >
              new password
            </label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              aria-describedby={errors.password ? 'password-error' : undefined}
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <p
                id="password-error"
                role="alert"
                className="mt-1.5 text-xs tracking-wide text-red-400/80"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="group">
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-[10px] font-medium tracking-widest text-outline-variant uppercase transition-colors duration-200 group-focus-within:text-primary"
            >
              confirm password
            </label>
            <PasswordInput
              id="confirmPassword"
              placeholder="••••••••"
              aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p
                id="confirm-error"
                role="alert"
                className="mt-1.5 text-xs tracking-wide text-red-400/80"
              >
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        {actionError === 'expired' && (
          <p role="alert" className="text-sm text-red-400">
            that link has expired.{' '}
            <Link href="/forgot-password" className="underline hover:text-red-300">
              request a new one
            </Link>
          </p>
        )}
        {actionError === 'invalid' && (
          <p role="alert" className="text-sm text-red-400">
            this link is invalid or already used.{' '}
            <Link href="/forgot-password" className="underline hover:text-red-300">
              request a new one
            </Link>
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="kinetic-gradient w-full cursor-pointer rounded-md py-4 text-xs font-bold tracking-widest text-on-primary uppercase shadow-[0_4px_16px_-2px_rgba(132,88,179,0.4)] hover:scale-[1.01] hover:shadow-[0_6px_20px_-2px_rgba(220,184,255,0.5)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          {isSubmitting ? 'resetting...' : 'reset password'}
        </button>
      </form>

      <Link
        href="/login"
        className="block text-center text-xs text-on-surface-variant transition-colors duration-200 hover:text-on-surface"
      >
        back to sign in
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Create `page.tsx`**

Create `src/app/(auth)/reset-password/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

import { findResetToken } from '@/features/auth/lib/reset-tokens';

import ResetPasswordForm from './ResetPasswordForm';

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) redirect('/forgot-password?expired=true');

  const record = await findResetToken(token);
  if (!record || record.expiresAt < new Date()) {
    redirect('/forgot-password?expired=true');
  }

  return <ResetPasswordForm token={token} />;
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run "src/app/\(auth\)/reset-password/ResetPasswordForm.test.tsx" --reporter=verbose 2>&1 | tail -12
```

Expected: 5 passing tests.

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit 2>&1; echo "EXIT: $?"
```

Expected: `EXIT: 0`

- [ ] **Step 7: Commit**

```bash
git add "src/app/(auth)/reset-password/"
git commit -m "feat(password-reset): add /reset-password page and form"
```

---

## Task 7: `LoginForm` — reset success banner

**Files:**

- Modify: `src/features/auth/components/LoginForm.tsx`
- Modify: `src/features/auth/components/LoginForm.test.tsx`

- [ ] **Step 1: Write failing test**

In `src/features/auth/components/LoginForm.test.tsx`, add a mock for `next/navigation` at the top (after existing mocks) and a new test:

```ts
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
```

Add import:

```ts
import { useSearchParams } from 'next/navigation';
const mockUseSearchParams = useSearchParams as ReturnType<typeof vi.fn>;
```

Add new test inside `describe('LoginForm')`:

```ts
it('shows reset success banner when ?reset=true is in URL', () => {
  mockUseSearchParams.mockReturnValue(new URLSearchParams('reset=true'));
  render(<LoginForm />);
  expect(screen.getByText(/password updated/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to confirm test fails**

```bash
npx vitest run src/features/auth/components/LoginForm.test.tsx 2>&1 | tail -8
```

Expected: new test fails, existing tests pass.

- [ ] **Step 3: Update `LoginForm.tsx`**

In `src/features/auth/components/LoginForm.tsx`, add `useSearchParams` import:

```ts
import { useSearchParams } from 'next/navigation';
```

Inside the `LoginForm` function, after the `useForm` call, add:

```ts
const searchParams = useSearchParams();
const showResetBanner = searchParams.get('reset') === 'true';
```

In the JSX, add the banner just before the `<form>` element:

```tsx
{
  showResetBanner && (
    <p
      role="status"
      className="rounded-lg border border-green-500/20 bg-green-500/8 px-3.5 py-3 text-sm text-green-400"
    >
      Password updated — please sign in.
    </p>
  );
}
```

- [ ] **Step 4: Run all LoginForm tests — expect pass**

```bash
npx vitest run src/features/auth/components/LoginForm.test.tsx --reporter=verbose 2>&1 | tail -12
```

Expected: all 6 tests pass.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -8
```

Expected: all tests pass.

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit 2>&1; echo "EXIT: $?"
```

Expected: `EXIT: 0`

- [ ] **Step 7: Commit**

```bash
git add src/features/auth/components/LoginForm.tsx src/features/auth/components/LoginForm.test.tsx
git commit -m "feat(password-reset): show reset success banner in LoginForm"
```

---

## Self-Review

**Spec coverage:**

- ✅ `PasswordResetToken` Prisma model (Task 1)
- ✅ `forgotPasswordAction` — silent on unknown email and OAuth users (Task 4)
- ✅ `resetPasswordAction` — validates token, expiry, password complexity; deletes token after use (Task 4)
- ✅ `sendPasswordResetEmail` via Resend (Task 3)
- ✅ `/forgot-password` page with sent/expired states (Task 5)
- ✅ `/reset-password?token=` — RSC validates token server-side before rendering form (Task 6)
- ✅ `/login?reset=true` banner in LoginForm (Task 7)
- ✅ Token is single-use (deleted on successful reset)
- ✅ No email existence leak — `forgotPasswordAction` always returns `{ sent: true }`
- ✅ OAuth users silently ignored in `forgotPasswordAction`
- ✅ Race condition guard in `resetPasswordAction` (re-validates token on submit)
- ✅ Tests for all functions and components

**Placeholder scan:** None found.

**Type consistency:**

- `forgotPasswordAction` returns `{ sent: true } | { error: string }` — used only in `ForgotPasswordForm` ✅
- `resetPasswordAction` returns `{ success: true } | { error: string }` — `ResetPasswordForm` checks `'error' in result` ✅
- `findResetToken` returns the Prisma model shape — `page.tsx` checks `record.expiresAt` ✅
- `token` prop on `ResetPasswordForm` is `string` — passed from page where it's already been validated ✅
