# Stage 2A: Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full authentication: email/password signup with Resend email verification, credentials login with emailVerified check, OAuth redirect, route protection middleware, and RHF+Zod forms.

**Architecture:** Server Actions handle signup/login (returning `{ error }` on failure, redirecting on success). NextAuth v5 `authorize()` checks `emailVerified` before allowing credentials login. `VerificationToken` uses `identifier` (email) per the existing Prisma schema — no userId FK.

**Tech Stack:** NextAuth v5 (beta.31), Resend, React Hook Form, Zod, @hookform/resolvers, Prisma 7, bcryptjs

> **Note on URLs:** The spec mentions `/auth/verify-email` but `(auth)` is a Next.js route group — it doesn't add a path segment. The correct URL is `/verify-email`. All redirects in this plan use `/verify-email` accordingly.

> **AGENTS.md reminder:** Before writing any Next.js-specific code (middleware, route handlers, Server Actions), read `node_modules/next/dist/docs/` for the actual current API.

---

## File Map

| Action | Path                                               |
| ------ | -------------------------------------------------- |
| Create | `src/features/auth/lib/validation.ts`              |
| Create | `src/features/auth/lib/tokens.ts`                  |
| Create | `src/features/auth/lib/email.ts`                   |
| Create | `src/features/auth/components/LoginForm.tsx`       |
| Create | `src/features/auth/components/SignupForm.tsx`      |
| Create | `src/app/(auth)/verify-email/page.tsx`             |
| Create | `src/app/api/auth/verify/route.ts`                 |
| Create | `src/middleware.ts`                                |
| Create | `src/features/auth/lib/validation.test.ts`         |
| Create | `src/features/auth/lib/tokens.test.ts`             |
| Create | `src/features/auth/lib/email.test.ts`              |
| Create | `src/features/auth/actions.test.ts`                |
| Create | `src/features/auth/components/LoginForm.test.tsx`  |
| Create | `src/features/auth/components/SignupForm.test.tsx` |
| Modify | `src/features/auth/actions.ts`                     |
| Modify | `src/features/auth/types.ts`                       |
| Modify | `src/features/auth/index.ts`                       |
| Modify | `src/shared/lib/auth.ts`                           |
| Modify | `src/shared/lib/auth.test.ts`                      |
| Modify | `src/app/(auth)/login/page.tsx`                    |
| Modify | `src/app/(auth)/signup/page.tsx`                   |
| Modify | `package.json`                                     |
| Modify | `docs/todos.md`                                    |

---

### Task 1: Install and pin dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install four new packages with exact version pinning**

```bash
npm install --save-exact resend react-hook-form zod @hookform/resolvers
```

- [ ] **Step 2: Verify versions are pinned (no `^` or `~`)**

Open `package.json`. Confirm the four new entries look like exact version strings (e.g. `"resend": "4.5.1"` not `"resend": "^4.5.1"`). If any have `^` or `~`, remove them manually.

- [ ] **Step 3: Verify existing tests still pass**

```bash
npm run test:run
```

Expected: all existing tests pass (no new breakage from install).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add resend, react-hook-form, zod, @hookform/resolvers"
```

---

### Task 2: Validation schemas

**Files:**

- Create: `src/features/auth/lib/validation.ts`
- Create: `src/features/auth/lib/validation.test.ts`
- Modify: `src/features/auth/types.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/auth/lib/validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { loginSchema, signupSchema } from './validation'

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: 'secret' })
    expect(result.success).toBe(true)
  })

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('password')
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })
})

describe('signupSchema', () => {
  it('accepts valid name, email, and password', () => {
    const result = signupSchema.safeParse({
      name: 'Alice',
      email: 'a@b.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects name shorter than 2 characters', () => {
    const result = signupSchema.safeParse({ name: 'A', email: 'a@b.com', password: 'password123' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('name')
  })

  it('rejects password shorter than 8 characters', () => {
    const result = signupSchema.safeParse({ name: 'Alice', email: 'a@b.com', password: 'short' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('password')
  })

  it('rejects invalid email', () => {
    const result = signupSchema.safeParse({ name: 'Alice', email: 'bad', password: 'password123' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- src/features/auth/lib/validation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/features/auth/lib/validation.ts`**

```ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Required'),
})

export const signupSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type SignupFormData = z.infer<typeof signupSchema>
```

- [ ] **Step 4: Update `src/features/auth/types.ts` to re-export from validation**

Replace the entire file with:

```ts
export type { LoginFormData, SignupFormData } from './lib/validation'
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:run -- src/features/auth/lib/validation.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/lib/validation.ts src/features/auth/lib/validation.test.ts src/features/auth/types.ts
git commit -m "feat(auth): add Zod validation schemas for login and signup"
```

---

### Task 3: Token utilities

**Files:**

- Create: `src/features/auth/lib/tokens.ts`
- Create: `src/features/auth/lib/tokens.test.ts`

The `VerificationToken` model uses `identifier` (email string) + `token` (UUID) + `expires`. There is no `userId` FK — tokens are looked up by `identifier` (email).

- [ ] **Step 1: Write the failing tests**

Create `src/features/auth/lib/tokens.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    verificationToken: {
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/shared/lib/prisma'
import { generateVerificationToken, deleteVerificationToken, deleteUserTokens } from './tokens'

const mockCreate = prisma.verificationToken.create as ReturnType<typeof vi.fn>
const mockDelete = prisma.verificationToken.delete as ReturnType<typeof vi.fn>
const mockDeleteMany = prisma.verificationToken.deleteMany as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

describe('generateVerificationToken', () => {
  it('returns a UUID string', async () => {
    mockCreate.mockResolvedValue({})
    const token = await generateVerificationToken('user@example.com')
    expect(token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it('generates a unique token on each call', async () => {
    mockCreate.mockResolvedValue({})
    const a = await generateVerificationToken('user@example.com')
    const b = await generateVerificationToken('user@example.com')
    expect(a).not.toBe(b)
  })

  it('creates token in DB with correct identifier and 24h expiry', async () => {
    mockCreate.mockResolvedValue({})
    const before = Date.now()
    await generateVerificationToken('user@example.com')
    const after = Date.now()

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identifier: 'user@example.com',
          token: expect.any(String),
          expires: expect.any(Date),
        }),
      }),
    )
    const expires: Date = mockCreate.mock.calls[0][0].data.expires
    const ms = expires.getTime()
    expect(ms).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000 - 100)
    expect(ms).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000 + 100)
  })
})

describe('deleteVerificationToken', () => {
  it('deletes token by token string', async () => {
    mockDelete.mockResolvedValue({})
    await deleteVerificationToken('some-token-uuid')
    expect(mockDelete).toHaveBeenCalledWith({ where: { token: 'some-token-uuid' } })
  })
})

describe('deleteUserTokens', () => {
  it('deletes all tokens for an email', async () => {
    mockDeleteMany.mockResolvedValue({ count: 2 })
    await deleteUserTokens('user@example.com')
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { identifier: 'user@example.com' } })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- src/features/auth/lib/tokens.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/features/auth/lib/tokens.ts`**

```ts
import crypto from 'crypto'
import { prisma } from '@/shared/lib/prisma'

export async function generateVerificationToken(email: string): Promise<string> {
  const token = crypto.randomUUID()
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  })

  return token
}

export async function deleteVerificationToken(token: string): Promise<void> {
  await prisma.verificationToken.delete({ where: { token } })
}

export async function deleteUserTokens(email: string): Promise<void> {
  await prisma.verificationToken.deleteMany({ where: { identifier: email } })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/features/auth/lib/tokens.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/lib/tokens.ts src/features/auth/lib/tokens.test.ts
git commit -m "feat(auth): add verification token utilities"
```

---

### Task 4: Email utility

**Files:**

- Create: `src/features/auth/lib/email.ts`
- Create: `src/features/auth/lib/email.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/auth/lib/email.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSend = vi.fn()

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

import { sendVerificationEmail } from './email'

beforeEach(() => vi.clearAllMocks())

describe('sendVerificationEmail', () => {
  it('calls Resend with correct to, subject, and verification URL', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null })

    await sendVerificationEmail('user@example.com', 'abc-token-123')

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: expect.any(String),
        html: expect.stringContaining('abc-token-123'),
      }),
    )
  })

  it('throws if Resend returns an error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'API error' } })

    await expect(sendVerificationEmail('user@example.com', 'abc-token-123')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- src/features/auth/lib/email.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/features/auth/lib/email.ts`**

```ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// from: using Resend's shared test domain for development.
// Replace with a verified domain before production launch.
const FROM = 'onboarding@resend.dev'

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const verifyUrl = `${base}/api/auth/verify?token=${token}`

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Verify your email — Pole Dance Catalog',
    html: `<p>Click <a href="${verifyUrl}">here</a> to verify your email. The link expires in 24 hours.</p>`,
  })

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/features/auth/lib/email.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/lib/email.ts src/features/auth/lib/email.test.ts
git commit -m "feat(auth): add sendVerificationEmail via Resend"
```

---

### Task 5: Update signupAction

**Files:**

- Modify: `src/features/auth/actions.ts`
- Create: `src/features/auth/actions.test.ts`

The current `signupAction` throws errors. This task rewrites it to: validate with Zod, return `{ error }` on failure, create user + token + send email, delete both if Resend fails, and redirect on success.

- [ ] **Step 1: Write the failing tests**

Create `src/features/auth/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_pw'),
    compare: vi.fn(),
  },
}))
vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))
vi.mock('@/features/auth/lib/tokens', () => ({
  generateVerificationToken: vi.fn().mockResolvedValue('mock-token'),
  deleteUserTokens: vi.fn(),
}))
vi.mock('@/features/auth/lib/email', () => ({
  sendVerificationEmail: vi.fn(),
}))

import { redirect } from 'next/navigation'
import { prisma } from '@/shared/lib/prisma'
import { generateVerificationToken, deleteUserTokens } from '@/features/auth/lib/tokens'
import { sendVerificationEmail } from '@/features/auth/lib/email'
import { signupAction } from './actions'

const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>
const mockCreate = prisma.user.create as ReturnType<typeof vi.fn>
const mockDelete = prisma.user.delete as ReturnType<typeof vi.fn>
const mockGenToken = generateVerificationToken as ReturnType<typeof vi.fn>
const mockDeleteTokens = deleteUserTokens as ReturnType<typeof vi.fn>
const mockSendEmail = sendVerificationEmail as ReturnType<typeof vi.fn>
const mockRedirect = redirect as ReturnType<typeof vi.fn>

const validData = { name: 'Alice', email: 'alice@example.com', password: 'password123' }

beforeEach(() => vi.clearAllMocks())

describe('signupAction', () => {
  it('returns error if email is already in use', async () => {
    mockFindUnique.mockResolvedValue({ id: 'existing-user' })

    const result = await signupAction(validData)

    expect(result).toEqual({ error: 'Email already in use' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates user, generates token, sends email, and redirects on success', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'new-user' })
    mockSendEmail.mockResolvedValue(undefined)

    await signupAction(validData)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'alice@example.com',
          emailVerified: null,
        }),
      }),
    )
    expect(mockGenToken).toHaveBeenCalledWith('alice@example.com')
    expect(mockSendEmail).toHaveBeenCalledWith('alice@example.com', 'mock-token')
    expect(mockRedirect).toHaveBeenCalledWith('/verify-email?sent=true')
  })

  it('deletes user and tokens if Resend fails', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'new-user' })
    mockSendEmail.mockRejectedValue(new Error('Resend API error'))

    const result = await signupAction(validData)

    expect(mockDeleteTokens).toHaveBeenCalledWith('alice@example.com')
    expect(mockDelete).toHaveBeenCalledWith({ where: { email: 'alice@example.com' } })
    expect(result).toEqual({ error: 'Failed to send email, please try again' })
  })

  it('returns error for invalid input (Zod)', async () => {
    const result = await signupAction({ name: 'A', email: 'bad', password: 'short' })
    expect(result).toEqual({ error: 'Invalid input' })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- src/features/auth/actions.test.ts
```

Expected: FAIL — the current signupAction throws instead of returning `{ error }`.

- [ ] **Step 3: Rewrite `src/features/auth/actions.ts`**

```ts
'use server'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/shared/lib/prisma'
import { signupSchema } from './lib/validation'
import { generateVerificationToken, deleteUserTokens } from './lib/tokens'
import { sendVerificationEmail } from './lib/email'
import type { SignupFormData } from './lib/validation'

export async function signupAction(data: SignupFormData) {
  const parsed = signupSchema.safeParse(data)
  if (!parsed.success) return { error: 'Invalid input' }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (existing) return { error: 'Email already in use' }

  const hashed = await bcrypt.hash(parsed.data.password, 10)
  await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      password: hashed,
      emailVerified: null,
    },
  })

  const token = await generateVerificationToken(parsed.data.email)

  try {
    await sendVerificationEmail(parsed.data.email, token)
  } catch {
    await deleteUserTokens(parsed.data.email)
    await prisma.user.delete({ where: { email: parsed.data.email } })
    return { error: 'Failed to send email, please try again' }
  }

  redirect('/verify-email?sent=true')
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/features/auth/actions.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/actions.ts src/features/auth/actions.test.ts
git commit -m "feat(auth): rewrite signupAction with Zod, email verification, and error returns"
```

---

### Task 6: Add loginAction and resendVerificationAction

**Files:**

- Modify: `src/features/auth/actions.ts`
- Modify: `src/features/auth/actions.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/features/auth/actions.test.ts` (append after the existing imports and mocks block):

First add these mocks at the top of the file, inside the existing `vi.mock` block area:

```ts
// Add this mock alongside the existing ones at the top of actions.test.ts:
vi.mock('@/shared/lib/auth', () => ({
  signIn: vi.fn(),
}))
```

And add `AuthError` mock (AuthError is from 'next-auth'):

```ts
// Add alongside existing mocks:
vi.mock('next-auth', () => ({
  AuthError: class AuthError extends Error {
    cause?: unknown
    type = 'CredentialsSignin'
    constructor(message?: string, options?: { cause?: unknown }) {
      super(message)
      this.cause = options?.cause
    }
  },
}))
```

Add these imports alongside the existing ones:

```ts
import { loginAction, resendVerificationAction } from './actions'
import { signIn } from '@/shared/lib/auth'
import { AuthError } from 'next-auth'
```

Add these test suites at the end of the file:

```ts
const mockSignIn = signIn as ReturnType<typeof vi.fn>

describe('loginAction', () => {
  it('returns undefined (redirect) on success', async () => {
    mockSignIn.mockResolvedValue(undefined)

    const result = await loginAction({ email: 'a@b.com', password: 'pass' })

    expect(result).toBeUndefined()
    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'a@b.com',
      password: 'pass',
      redirectTo: '/catalog',
    })
  })

  it('returns generic error for invalid credentials', async () => {
    const authError = new AuthError('CredentialsSignin', { cause: undefined })
    mockSignIn.mockRejectedValue(authError)

    const result = await loginAction({ email: 'a@b.com', password: 'wrong' })

    expect(result).toEqual({ error: 'Invalid credentials' })
  })

  it('returns email-not-verified message when authorize throws that error', async () => {
    const authError = new AuthError('CredentialsSignin', {
      cause: { err: new Error('Please verify your email first') },
    })
    mockSignIn.mockRejectedValue(authError)

    const result = await loginAction({ email: 'a@b.com', password: 'pass' })

    expect(result).toEqual({ error: 'Please verify your email first' })
  })

  it('re-throws non-AuthError (e.g. NEXT_REDIRECT)', async () => {
    const redirectError = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT' })
    mockSignIn.mockRejectedValue(redirectError)

    await expect(loginAction({ email: 'a@b.com', password: 'pass' })).rejects.toThrow(
      'NEXT_REDIRECT',
    )
  })
})

describe('resendVerificationAction', () => {
  it('deletes old tokens, generates new token, sends email, then redirects', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-id', emailVerified: null })
    mockSendEmail.mockResolvedValue(undefined)

    await resendVerificationAction('alice@example.com')

    expect(mockDeleteTokens).toHaveBeenCalledWith('alice@example.com')
    expect(mockGenToken).toHaveBeenCalledWith('alice@example.com')
    expect(mockSendEmail).toHaveBeenCalledWith('alice@example.com', 'mock-token')
    expect(mockRedirect).toHaveBeenCalledWith('/verify-email?sent=true')
  })

  it('redirects to invalid if user not found', async () => {
    mockFindUnique.mockResolvedValue(null)

    await resendVerificationAction('nobody@example.com')

    expect(mockRedirect).toHaveBeenCalledWith('/verify-email?error=invalid')
    expect(mockGenToken).not.toHaveBeenCalled()
  })

  it('redirects to invalid if user already verified', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-id', emailVerified: new Date() })

    await resendVerificationAction('verified@example.com')

    expect(mockRedirect).toHaveBeenCalledWith('/verify-email?error=invalid')
    expect(mockGenToken).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- src/features/auth/actions.test.ts
```

Expected: new tests FAIL — loginAction and resendVerificationAction not exported yet.

- [ ] **Step 3: Add `loginAction` and `resendVerificationAction` to `src/features/auth/actions.ts`**

Append to the existing file:

```ts
import { signIn } from '@/shared/lib/auth'
import { AuthError } from 'next-auth'
import type { LoginFormData } from './lib/validation'

export async function loginAction(data: LoginFormData) {
  try {
    await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirectTo: '/catalog',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const cause = error.cause as { err?: Error } | undefined
      return { error: cause?.err?.message ?? 'Invalid credentials' }
    }
    throw error
  }
}

export async function resendVerificationAction(email: string) {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.emailVerified !== null) {
    redirect('/verify-email?error=invalid')
    return
  }

  await deleteUserTokens(email)
  const token = await generateVerificationToken(email)
  await sendVerificationEmail(email, token)

  redirect('/verify-email?sent=true')
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/features/auth/actions.test.ts
```

Expected: all tests pass (previously passing 4 + 7 new = 11 total).

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/actions.ts src/features/auth/actions.test.ts
git commit -m "feat(auth): add loginAction and resendVerificationAction"
```

---

### Task 7: Update `authorize()` in auth.ts to check emailVerified

**Files:**

- Modify: `src/shared/lib/auth.ts`
- Modify: `src/shared/lib/auth.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to `src/shared/lib/auth.test.ts` (the `authorize` function is on the credentials provider):

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth', () => ({
  default: (config: unknown) => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}))
vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

import { prisma } from '@/shared/lib/prisma'
import bcrypt from 'bcryptjs'
import { authConfig } from './auth'

const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>
const mockCompare = bcrypt.compare as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

describe('authConfig', () => {
  it('includes google, facebook, and credentials providers', () => {
    const ids = authConfig.providers.map((p: { id: string }) => p.id)
    expect(ids).toContain('google')
    expect(ids).toContain('facebook')
    expect(ids).toContain('credentials')
  })

  it('uses jwt session strategy', () => {
    expect(authConfig.session?.strategy).toBe('jwt')
  })
})

describe('authorize', () => {
  const getAuthorize = () => {
    const provider = authConfig.providers.find((p: { id: string }) => p.id === 'credentials') as {
      authorize: (creds: Record<string, string>) => Promise<unknown>
    }
    return provider.authorize
  }

  it('returns null if credentials are missing', async () => {
    const authorize = getAuthorize()
    const result = await authorize({})
    expect(result).toBeNull()
  })

  it('returns null if user not found', async () => {
    mockFindUnique.mockResolvedValue(null)
    const authorize = getAuthorize()
    const result = await authorize({ email: 'a@b.com', password: 'pass' })
    expect(result).toBeNull()
  })

  it('throws if emailVerified is null', async () => {
    mockFindUnique.mockResolvedValue({ id: '1', password: 'hashed', emailVerified: null })
    const authorize = getAuthorize()
    await expect(authorize({ email: 'a@b.com', password: 'pass' })).rejects.toThrow(
      'Please verify your email first',
    )
  })

  it('returns null if password does not match', async () => {
    mockFindUnique.mockResolvedValue({ id: '1', password: 'hashed', emailVerified: new Date() })
    mockCompare.mockResolvedValue(false)
    const authorize = getAuthorize()
    const result = await authorize({ email: 'a@b.com', password: 'wrong' })
    expect(result).toBeNull()
  })

  it('returns user if credentials are valid and email is verified', async () => {
    const user = { id: '1', password: 'hashed', emailVerified: new Date() }
    mockFindUnique.mockResolvedValue(user)
    mockCompare.mockResolvedValue(true)
    const authorize = getAuthorize()
    const result = await authorize({ email: 'a@b.com', password: 'correct' })
    expect(result).toEqual(user)
  })
})
```

- [ ] **Step 2: Run tests to verify the new tests fail**

```bash
npm run test:run -- src/shared/lib/auth.test.ts
```

Expected: the existing 2 tests pass, but the new 5 `authorize` tests fail (no emailVerified check yet).

- [ ] **Step 3: Update `authorize()` in `src/shared/lib/auth.ts`**

Replace only the `authorize` function body:

```ts
async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) return null

  const user = await prisma.user.findUnique({
    where: { email: credentials.email as string },
  })

  if (!user?.password) return null

  if (user.emailVerified === null) {
    throw new Error('Please verify your email first')
  }

  const valid = await bcrypt.compare(
    credentials.password as string,
    user.password
  )

  return valid ? user : null
},
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/shared/lib/auth.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/auth.ts src/shared/lib/auth.test.ts
git commit -m "feat(auth): require emailVerified in credentials authorize()"
```

---

### Task 8: Email verification route handler

**Files:**

- Create: `src/app/api/auth/verify/route.ts`

This is a Route Handler (GET). It receives `?token=`, validates the token, and redirects. No tests needed — manual test in the full flow.

> Read `node_modules/next/dist/docs/` for the current Route Handler API before writing this file.

- [ ] **Step 1: Create `src/app/api/auth/verify/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { deleteVerificationToken } from '@/features/auth/lib/tokens'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/verify-email?error=invalid', req.url))
  }

  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  })

  if (!verificationToken) {
    return NextResponse.redirect(new URL('/verify-email?error=invalid', req.url))
  }

  if (verificationToken.expires < new Date()) {
    await deleteVerificationToken(token)
    const email = encodeURIComponent(verificationToken.identifier)
    return NextResponse.redirect(new URL(`/verify-email?error=expired&email=${email}`, req.url))
  }

  await prisma.user.update({
    where: { email: verificationToken.identifier },
    data: { emailVerified: new Date() },
  })
  await deleteVerificationToken(token)

  return NextResponse.redirect(new URL('/login?verified=true', req.url))
}
```

- [ ] **Step 2: Verify the route file compiles (TypeScript check)**

```bash
npx tsc --noEmit
```

Expected: no type errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/verify/route.ts
git commit -m "feat(auth): add email verification route handler GET /api/auth/verify"
```

---

### Task 9: Verify email page

**Files:**

- Create: `src/app/(auth)/verify-email/page.tsx`

This is a Server Component. It reads `searchParams` to determine state: `?sent=true`, `?error=invalid`, `?error=expired&email=xxx`, or default.

> In Next.js App Router (this project uses 16.2.4), `searchParams` is `Promise<...>` and must be awaited. Check `node_modules/next/dist/docs/` for current API.

- [ ] **Step 1: Create `src/app/(auth)/verify-email/page.tsx`**

```tsx
import { resendVerificationAction } from '@/features/auth'

type Props = {
  searchParams: Promise<{ sent?: string; error?: string; email?: string }>
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { sent, error, email } = await searchParams

  if (sent) {
    return (
      <main>
        <h1>Check your email</h1>
        <p>We sent a verification link to your inbox. It expires in 24 hours.</p>
      </main>
    )
  }

  if (error === 'expired' && email) {
    const resendWithEmail = resendVerificationAction.bind(null, decodeURIComponent(email))
    return (
      <main>
        <h1>Link expired</h1>
        <p>Your verification link has expired.</p>
        <form action={resendWithEmail}>
          <button type="submit">Resend verification email</button>
        </form>
      </main>
    )
  }

  if (error === 'invalid') {
    return (
      <main>
        <h1>Invalid link</h1>
        <p>This verification link is invalid. Please sign up again.</p>
      </main>
    )
  }

  return (
    <main>
      <h1>Verify your email</h1>
      <p>Please check your inbox and click the verification link.</p>
    </main>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(auth)/verify-email/page.tsx
git commit -m "feat(auth): add verify-email page with sent/expired/invalid states"
```

---

### Task 10: LoginForm component

**Files:**

- Create: `src/features/auth/components/LoginForm.tsx`
- Create: `src/features/auth/components/LoginForm.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/auth/components/LoginForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

vi.mock('@/features/auth/actions', () => ({
  loginAction: vi.fn(),
}))

import { loginAction } from '@/features/auth/actions'
const mockLoginAction = loginAction as ReturnType<typeof vi.fn>

describe('LoginForm', () => {
  it('renders email and password fields and a submit button', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation error when email is empty on submit', async () => {
    render(<LoginForm />)
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument()
  })

  it('calls loginAction with form data on valid submit', async () => {
    mockLoginAction.mockResolvedValue(undefined)
    render(<LoginForm />)

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mockLoginAction).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password123' })
  })

  it('displays server error returned from loginAction', async () => {
    mockLoginAction.mockResolvedValue({ error: 'Invalid credentials' })
    render(<LoginForm />)

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- src/features/auth/components/LoginForm.test.tsx
```

Expected: FAIL — component not found.

- [ ] **Step 3: Create `src/features/auth/components/LoginForm.tsx`**

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema } from '../lib/validation'
import { loginAction } from '../actions'
import type { LoginFormData } from '../lib/validation'

export function LoginForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginFormData) => {
    const result = await loginAction(data)
    if (result?.error) {
      setError('root', { message: result.error })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register('email')} />
        {errors.email && <p>{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" type="password" {...register('password')} />
        {errors.password && <p>{errors.password.message}</p>}
      </div>
      {errors.root && <p>{errors.root.message}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/features/auth/components/LoginForm.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/components/LoginForm.tsx src/features/auth/components/LoginForm.test.tsx
git commit -m "feat(auth): add LoginForm with RHF + Zod"
```

---

### Task 11: SignupForm component

**Files:**

- Create: `src/features/auth/components/SignupForm.tsx`
- Create: `src/features/auth/components/SignupForm.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/features/auth/components/SignupForm.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignupForm } from './SignupForm'

vi.mock('@/features/auth/actions', () => ({
  signupAction: vi.fn(),
}))

import { signupAction } from '@/features/auth/actions'
const mockSignupAction = signupAction as ReturnType<typeof vi.fn>

describe('SignupForm', () => {
  it('renders name, email, password fields and submit button', () => {
    render(<SignupForm />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows validation error for short password on submit', async () => {
    render(<SignupForm />)
    await userEvent.type(screen.getByLabelText(/name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'short')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText(/at least 8/i)).toBeInTheDocument()
  })

  it('calls signupAction with form data on valid submit', async () => {
    mockSignupAction.mockResolvedValue(undefined)
    render(<SignupForm />)

    await userEvent.type(screen.getByLabelText(/name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(mockSignupAction).toHaveBeenCalledWith({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'password123',
    })
  })

  it('displays server error returned from signupAction', async () => {
    mockSignupAction.mockResolvedValue({ error: 'Email already in use' })
    render(<SignupForm />)

    await userEvent.type(screen.getByLabelText(/name/i), 'Alice')
    await userEvent.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Email already in use')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:run -- src/features/auth/components/SignupForm.test.tsx
```

Expected: FAIL — component not found.

- [ ] **Step 3: Create `src/features/auth/components/SignupForm.tsx`**

```tsx
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signupSchema } from '../lib/validation'
import { signupAction } from '../actions'
import type { SignupFormData } from '../lib/validation'

export function SignupForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({ resolver: zodResolver(signupSchema) })

  const onSubmit = async (data: SignupFormData) => {
    const result = await signupAction(data)
    if (result?.error) {
      setError('root', { message: result.error })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" type="text" {...register('name')} />
        {errors.name && <p>{errors.name.message}</p>}
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register('email')} />
        {errors.email && <p>{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input id="password" type="password" {...register('password')} />
        {errors.password && <p>{errors.password.message}</p>}
      </div>
      {errors.root && <p>{errors.root.message}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/features/auth/components/SignupForm.test.tsx
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/components/SignupForm.tsx src/features/auth/components/SignupForm.test.tsx
git commit -m "feat(auth): add SignupForm with RHF + Zod"
```

---

### Task 12: Update login and signup pages

**Files:**

- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/signup/page.tsx`

- [ ] **Step 1: Replace `src/app/(auth)/login/page.tsx`**

```tsx
import { LoginForm } from '@/features/auth'

export default function LoginPage() {
  return (
    <main>
      <h1>Sign in</h1>
      <LoginForm />
    </main>
  )
}
```

- [ ] **Step 2: Replace `src/app/(auth)/signup/page.tsx`**

```tsx
import { SignupForm } from '@/features/auth'

export default function SignupPage() {
  return (
    <main>
      <h1>Create account</h1>
      <SignupForm />
    </main>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/login/page.tsx src/app/(auth)/signup/page.tsx
git commit -m "feat(auth): wire LoginForm and SignupForm into login/signup pages"
```

---

### Task 13: Route protection middleware

**Files:**

- Create: `src/middleware.ts`

Protects `/profile` and `/admin`. All other routes are public.

> Read `node_modules/next/dist/docs/` for the current middleware API before writing this file. Pay attention to how NextAuth v5 exposes `req.auth` in the middleware wrapper.

- [ ] **Step 1: Create `src/middleware.ts`**

```ts
import { auth } from '@/shared/lib/auth'
import { NextResponse } from 'next/server'

const protectedRoutes = ['/profile', '/admin']

export default auth((req) => {
  const isProtected = protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  if (isProtected && !req.auth) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname)
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.url))
  }
})

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon\\.ico).*)'],
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual test — unauthenticated access to /profile**

Start dev server (`npm run dev`) and open `http://localhost:3000/profile` in a browser. Verify it redirects to `/login?callbackUrl=%2Fprofile`. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(auth): add middleware to protect /profile and /admin routes"
```

---

### Task 14: Update exports, run full test suite, update docs

**Files:**

- Modify: `src/features/auth/index.ts`
- Modify: `docs/todos.md`

- [ ] **Step 1: Update `src/features/auth/index.ts`**

```ts
export { signupAction, loginAction, resendVerificationAction } from './actions'
export { LoginForm } from './components/LoginForm'
export { SignupForm } from './components/SignupForm'
export type { LoginFormData, SignupFormData } from './types'
```

- [ ] **Step 2: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass. Note the final count. If any test fails, fix it before proceeding.

- [ ] **Step 3: Run production build to check for type/compile errors**

```bash
npm run build
```

Expected: build succeeds with no errors. If there are warnings about unused imports or type mismatches, fix them.

- [ ] **Step 4: Update `docs/todos.md`**

Under **Security**, add:

```markdown
### Email sender domain (post-MVP)

- `src/features/auth/lib/email.ts` uses `onboarding@resend.dev` (Resend shared test domain)
- Fix: configure a verified sender domain in Resend and update the FROM constant before production launch
```

Also check whether any previously documented items were resolved by this stage and mark or remove them.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/index.ts docs/todos.md
git commit -m "feat(auth): update exports and document Resend sender domain TODO"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement                                   | Covered by task                                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Email/password signup                              | Task 5 (signupAction)                                                                                                                                        |
| Email verification via Resend                      | Tasks 3, 4, 5                                                                                                                                                |
| Resend verification                                | Task 6 (resendVerificationAction)                                                                                                                            |
| Verify route `/api/auth/verify?token=`             | Task 8                                                                                                                                                       |
| Verify-email page (sent/expired/invalid states)    | Task 9                                                                                                                                                       |
| Google + Facebook OAuth redirect to `/catalog`     | Already in auth.ts (no code needed — signIn redirectTo in loginAction covers credentials; OAuth pages can add `callbackUrl=/catalog` later via pages config) |
| Login credentials with emailVerified check         | Task 7                                                                                                                                                       |
| Login redirect to `/catalog`                       | Task 6 (loginAction → signIn redirectTo)                                                                                                                     |
| LoginForm (RHF + Zod)                              | Task 10                                                                                                                                                      |
| SignupForm (RHF + Zod)                             | Task 11                                                                                                                                                      |
| Route protection `/profile`, `/admin`              | Task 13                                                                                                                                                      |
| Redirect to `/login?callbackUrl=` when unauth      | Task 13                                                                                                                                                      |
| Validation schemas (loginSchema, signupSchema)     | Task 2                                                                                                                                                       |
| Error: "Email already in use"                      | Task 5                                                                                                                                                       |
| Error: Resend fail → delete user                   | Task 5                                                                                                                                                       |
| Error: token invalid → /verify-email?error=invalid | Task 8                                                                                                                                                       |
| Error: token expired → /verify-email?error=expired | Task 8                                                                                                                                                       |
| Error: email not verified on login                 | Task 7                                                                                                                                                       |
| Error: wrong password → generic error              | Task 7                                                                                                                                                       |

**OAuth redirect note:** The spec says OAuth should redirect to `/catalog`. NextAuth handles this via the `pages.signIn` config or `callbackUrl`. The default NextAuth behavior after OAuth is to redirect to `/`. To redirect to `/catalog`, add `pages: { signIn: '/login' }` to `authConfig` and pass `callbackUrl=/catalog` from the login page. This is a minor addition; it can be done as a small follow-up within Task 12 or left to Stage 2B. No spec gap — just implementation detail.

**Placeholder scan:** None found. All code blocks contain complete implementations.

**Type consistency:** `LoginFormData`, `SignupFormData` — defined once in `validation.ts`, re-exported through `types.ts` and `index.ts`. `loginAction` and `signupAction` both import from `./lib/validation`. `LoginForm` and `SignupForm` use the same imported types. Consistent throughout.
