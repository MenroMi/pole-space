# Cross-Tab Auth Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix stale client state when auth changes in another tab — resend action gracefully handles already-verified users, verify-email page auto-redirects on focus, and authenticated pages redirect when session is gone.

**Architecture:** All work in `.worktrees/cross-tab-auth-sync/` on `feature/cross-tab-auth-sync`. Adds `SessionProvider` to root layout for session re-fetch on focus, fixes `resendVerificationAction` to redirect to `/login` when user is already verified, adds a `visibilitychange` hook in `ResendForm` that checks DB for email verification, and adds a `SessionGuard` client component that watches `useSession` and redirects on logout.

**Tech Stack:** Next.js 16 App Router, NextAuth v5 beta.31, `next-auth/react` (SessionProvider, useSession), Vitest + RTL, Prisma 7.

---

All steps below run inside `.worktrees/cross-tab-auth-sync/`.

---

### Task 1: Fix resendVerificationAction redirect for already-verified users

**Files:**
- Modify: `src/features/auth/actions.test.ts`
- Modify: `src/features/auth/actions.ts`

- [ ] **Step 1: Update the existing test to expect redirect to /login**

In `src/features/auth/actions.test.ts`, find the test `'redirects to invalid if user already verified'` (inside `describe('resendVerificationAction', ...)`) and replace it:

```ts
it('redirects to /login if user already verified', async () => {
  mockFindUnique.mockResolvedValue({ id: 'user-id', emailVerified: new Date() });

  await expect(resendVerificationAction('verified@example.com')).rejects.toThrow('NEXT_REDIRECT');

  expect(mockRedirect).toHaveBeenCalledWith('/login');
  expect(mockGenToken).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run updated test to verify it fails**

```bash
npx vitest run src/features/auth/actions.test.ts
```

Expected: one test FAIL — `redirects to /login if user already verified` (got `/verify-email?error=invalid`, expected `/login`). All others pass.

- [ ] **Step 3: Split the guard in resendVerificationAction**

In `src/features/auth/actions.ts`, replace:

```ts
  if (!user || user.emailVerified !== null) {
    redirect('/verify-email?error=invalid');
  }
```

With:

```ts
  if (!user) redirect('/verify-email?error=invalid');
  if (user.emailVerified !== null) redirect('/login');
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/features/auth/actions.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/actions.ts src/features/auth/actions.test.ts
git commit -m "fix(auth): redirect to /login when resending to already-verified user"
```

---

### Task 2: Add SessionProvider to root layout

**Files:**
- Create: `src/shared/components/Providers.tsx`
- Modify: `src/app/layout.tsx`

No unit test for `Providers.tsx` — it is a zero-logic wrapper; integration coverage comes from all other tests that render the app.

- [ ] **Step 1: Create Providers.tsx**

Create `src/shared/components/Providers.tsx`:

```tsx
'use client';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchOnWindowFocus>{children}</SessionProvider>;
}
```

- [ ] **Step 2: Wrap root layout children with Providers**

In `src/app/layout.tsx`, add the import and wrap `{children}`:

```tsx
import type { Metadata } from 'next';
import { Space_Grotesk, Manrope } from 'next/font/google';

import { Providers } from '@/shared/components/Providers';

import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
});

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Pole Space — Pole Artistry Platform',
  description: 'Catalog of pole dance moves',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${manrope.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/Providers.tsx src/app/layout.tsx
git commit -m "feat(auth): add SessionProvider with refetchOnWindowFocus to root layout"
```

---

### Task 3: Add checkEmailVerifiedAction server action

**Files:**
- Modify: `src/features/auth/actions.ts`
- Modify: `src/features/auth/actions.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/features/auth/actions.test.ts`, add a new describe block at the bottom. The existing mock for `prisma.user.findUnique` is already set up — `mockFindUnique` returns whatever shape you give it.

```ts
import { checkEmailVerifiedAction } from './actions';

describe('checkEmailVerifiedAction', () => {
  it('returns true when user has emailVerified set', async () => {
    mockFindUnique.mockResolvedValue({ emailVerified: new Date('2026-01-01') });

    const result = await checkEmailVerifiedAction('verified@example.com');

    expect(result).toBe(true);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: 'verified@example.com' },
      select: { emailVerified: true },
    });
  });

  it('returns false when user emailVerified is null', async () => {
    mockFindUnique.mockResolvedValue({ emailVerified: null });

    const result = await checkEmailVerifiedAction('unverified@example.com');

    expect(result).toBe(false);
  });

  it('returns false when user does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await checkEmailVerifiedAction('nobody@example.com');

    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/features/auth/actions.test.ts
```

Expected: 3 tests FAIL — `checkEmailVerifiedAction` is not exported.

- [ ] **Step 3: Add the action to actions.ts**

In `src/features/auth/actions.ts`, add at the bottom (after `resendVerificationAction`):

```ts
export async function checkEmailVerifiedAction(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true },
  });
  return user !== null && user.emailVerified !== null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/features/auth/actions.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/actions.ts src/features/auth/actions.test.ts
git commit -m "feat(auth): add checkEmailVerifiedAction server action"
```

---

### Task 4: Add visibilitychange sync to ResendForm

**Files:**
- Create: `src/app/(auth)/verify-email/ResendForm.test.tsx`
- Modify: `src/app/(auth)/verify-email/ResendForm.tsx`
- Modify: `src/app/(auth)/verify-email/page.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/app/(auth)/verify-email/ResendForm.test.tsx`:

```tsx
import { render, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));
vi.mock('@/features/auth/actions', () => ({
  checkEmailVerifiedAction: vi.fn(),
}));
vi.mock('@/features/auth', () => ({
  RESEND_COOLDOWN_S: 60,
}));

import { checkEmailVerifiedAction } from '@/features/auth/actions';

import { ResendForm } from './ResendForm';

const mockReplace = vi.fn();
const mockCheckVerified = checkEmailVerifiedAction as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue({ replace: mockReplace } as ReturnType<typeof useRouter>);
});

describe('ResendForm — visibilitychange', () => {
  it('calls router.replace(/login) when tab gains focus and email is verified', async () => {
    mockCheckVerified.mockResolvedValue(true);

    render(<ResendForm action={vi.fn()} email="alice@example.com" />);

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => {
      expect(mockCheckVerified).toHaveBeenCalledWith('alice@example.com');
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('does not redirect when tab gains focus but email is not yet verified', async () => {
    mockCheckVerified.mockResolvedValue(false);

    render(<ResendForm action={vi.fn()} email="alice@example.com" />);

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => {
      expect(mockCheckVerified).toHaveBeenCalledWith('alice@example.com');
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not call checkEmailVerifiedAction when visibility is hidden', async () => {
    mockCheckVerified.mockResolvedValue(false);

    render(<ResendForm action={vi.fn()} email="alice@example.com" />);

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await new Promise((r) => setTimeout(r, 50));
    expect(mockCheckVerified).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/app/'(auth)'/verify-email/ResendForm.test.tsx
```

Expected: tests FAIL — `email` prop not accepted, `visibilitychange` logic not implemented.

- [ ] **Step 3: Update ResendForm.tsx**

Replace the full content of `src/app/(auth)/verify-email/ResendForm.tsx`:

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { useRouter } from 'next/navigation';

import { checkEmailVerifiedAction } from '@/features/auth/actions';
import { RESEND_COOLDOWN_S } from '@/features/auth';

function SubmitButton({ remaining }: { remaining: number }) {
  const { pending } = useFormStatus();
  const blocked = pending || remaining > 0;

  return (
    <button
      type="submit"
      disabled={blocked}
      className="kinetic-gradient w-full cursor-pointer rounded-md py-4 text-xs font-bold tracking-widest text-on-primary uppercase shadow-[0_4px_16px_-2px_rgba(132,88,179,0.4)] hover:scale-[1.01] hover:shadow-[0_6px_20px_-2px_rgba(220,184,255,0.5)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
    >
      {pending
        ? 'sending...'
        : remaining > 0
          ? `resend in ${remaining}s`
          : 'resend verification email'}
    </button>
  );
}

type Props = { action: () => Promise<void>; initialRemaining?: number; email: string };

export function ResendForm({ action, initialRemaining = 0, email }: Props) {
  const [remaining, setRemaining] = useState(initialRemaining);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    if (initialRemaining > 0) startCountdown(initialRemaining);
    return () => clearInterval(intervalRef.current);
  }, [initialRemaining]);

  useEffect(() => {
    async function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        const verified = await checkEmailVerifiedAction(email);
        if (verified) router.replace('/login');
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [email, router]);

  function startCountdown(seconds: number) {
    clearInterval(intervalRef.current);
    setRemaining(seconds);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleAction() {
    startCountdown(RESEND_COOLDOWN_S);
    await action();
  }

  return (
    <form action={handleAction}>
      <SubmitButton remaining={remaining} />
    </form>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/app/'(auth)'/verify-email/ResendForm.test.tsx
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Update page.tsx to pass email prop**

In `src/app/(auth)/verify-email/page.tsx`, add `email` to every `<ResendForm>` instance. There are three render paths:

**`sent` state**: `<ResendForm action={resendWithEmail} initialRemaining={initialRemaining} />` → add `email={validEmail}`:
```tsx
<ResendForm action={resendWithEmail} initialRemaining={initialRemaining} email={validEmail} />
```

**`expired` state**: `<ResendForm action={resendWithEmail} initialRemaining={initialRemaining} />` → add `email={email!}`:
```tsx
<ResendForm action={resendWithEmail} initialRemaining={initialRemaining} email={email!} />
```

**`send-failed` state**: `<ResendForm action={resendWithEmail} />` → add `email={email!}`:
```tsx
<ResendForm action={resendWithEmail} email={email!} />
```

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/'(auth)'/verify-email/ResendForm.tsx \
        src/app/'(auth)'/verify-email/ResendForm.test.tsx \
        src/app/'(auth)'/verify-email/page.tsx
git commit -m "feat(auth): redirect from verify-email when email verified in another tab"
```

---

### Task 5: Add SessionGuard for profile layout

**Files:**
- Create: `src/shared/components/SessionGuard.tsx`
- Create: `src/shared/components/SessionGuard.test.tsx`
- Modify: `src/app/(main)/profile/layout.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/shared/components/SessionGuard.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

import { SessionGuard } from './SessionGuard';

const mockReplace = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue({ replace: mockReplace } as ReturnType<typeof useRouter>);
});

describe('SessionGuard', () => {
  it('redirects to /login when session status is unauthenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      status: 'unauthenticated',
      data: null,
      update: vi.fn(),
    });

    render(<SessionGuard><div>protected</div></SessionGuard>);

    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('does not redirect when session status is authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      status: 'authenticated',
      data: { user: { name: 'Alice' }, expires: '2099-01-01' },
      update: vi.fn(),
    });

    render(<SessionGuard><div>protected</div></SessionGuard>);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect while session is loading', () => {
    vi.mocked(useSession).mockReturnValue({
      status: 'loading',
      data: null,
      update: vi.fn(),
    });

    render(<SessionGuard><div>protected</div></SessionGuard>);

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders children regardless of session status', () => {
    vi.mocked(useSession).mockReturnValue({
      status: 'authenticated',
      data: { user: {}, expires: '2099-01-01' },
      update: vi.fn(),
    });

    const { getByText } = render(
      <SessionGuard><div>protected content</div></SessionGuard>,
    );

    expect(getByText('protected content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/shared/components/SessionGuard.test.tsx
```

Expected: tests FAIL — `SessionGuard` does not exist.

- [ ] **Step 3: Create SessionGuard.tsx**

Create `src/shared/components/SessionGuard.tsx`:

```tsx
'use client';
import { useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  return <>{children}</>;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/shared/components/SessionGuard.test.tsx
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Add SessionGuard to profile layout**

In `src/app/(main)/profile/layout.tsx`, import `SessionGuard` and wrap the returned JSX:

```tsx
import { redirect } from 'next/navigation';

import ProfileAside from '@/features/profile/components/ProfileAside';
import PageShell from '@/shared/components/PageShell';
import { SessionGuard } from '@/shared/components/SessionGuard';
import { auth } from '@/shared/lib/auth';

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <SessionGuard>
      <PageShell
        aside={
          <ProfileAside name={session?.user?.name ?? null} image={session?.user?.image ?? null} />
        }
      >
        {children}
      </PageShell>
    </SessionGuard>
  );
}
```

- [ ] **Step 6: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/SessionGuard.tsx \
        src/shared/components/SessionGuard.test.tsx \
        src/app/'(main)'/profile/layout.tsx
git commit -m "feat(auth): add SessionGuard to profile layout for cross-tab logout sync"
```

---

### Task 6: Typecheck and final verification

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 2: Run full test suite one more time**

```bash
npx vitest run
```

Expected: all tests PASS. Note the count.

- [ ] **Step 3: Update docs/todos.md**

Mark the cross-tab auth sync entry under `## Auth Sync` as resolved with today's date. Add note: `SessionGuard` for `/admin` layout — add when admin feature is built.
