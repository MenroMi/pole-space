# Cross-Tab Auth Sync — Design Spec
Date: 2026-04-22

## Problem

Two UX bugs caused by stale client state when auth changes in another tab:

1. **verify-email resend error**: User opens `/verify-email` in Tab A, verifies email in Tab B, comes back to Tab A and clicks resend after cooldown — gets `?error=invalid` screen ("invalid link") instead of a helpful message.
2. **Stale authenticated UI**: User logged in on multiple tabs, logs out in Tab A — other tabs still show authenticated UI until the user navigates.

Both are fixed without polling or BroadcastChannel.

---

## Scope

### In scope
- Fix `resendVerificationAction` redirect when user is already verified (goes into `feature/auth-redesign`)
- `visibilitychange` check on `/verify-email` — auto-redirect to `/login` when email is verified in another tab
- `SessionProvider` in root layout with `refetchOnWindowFocus`
- `SessionGuard` in `/profile` layout — redirect to `/login` when session is gone

### Out of scope
- BroadcastChannel / real-time push
- `/admin` SessionGuard (added when admin is built)
- Token/session expiry handling (post-MVP)

---

## Part 0 — resendVerificationAction fix (feature/auth-redesign)

**File:** `src/features/auth/actions.ts`

Change:
```ts
if (!user || user.emailVerified !== null) {
  redirect('/verify-email?error=invalid');
}
```
To:
```ts
if (!user) redirect('/verify-email?error=invalid');
if (user.emailVerified !== null) redirect('/login');
```

No new UI needed — `/login` already exists. No query param message needed (the user is simply done with verification, login page is the right destination).

---

## Part 1 — SessionProvider in root layout

### New file: `src/shared/components/Providers.tsx`
```tsx
'use client';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchOnWindowFocus>{children}</SessionProvider>;
}
```

### Updated: `src/app/layout.tsx`
Wrap `{children}` with `<Providers>`. Root layout stays a Server Component — `Providers` is the only client boundary here.

`refetchOnWindowFocus` causes NextAuth to re-fetch the session when a tab gains focus. No polling, no interval.

---

## Part 2 — verify-email visibilitychange

### New server action: `checkEmailVerifiedAction`
**File:** `src/features/auth/actions.ts`

```ts
export async function checkEmailVerifiedAction(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true },
  });
  return user?.emailVerified !== null && user?.emailVerified !== undefined;
}
```

### Updated: `src/app/(auth)/verify-email/ResendForm.tsx`
- Add `email: string` to `Props`
- Add `useRouter` from `next/navigation`
- Add `useEffect` that registers a `visibilitychange` listener:
  - On `document.visibilityState === 'visible'`: call `checkEmailVerifiedAction(email)`
  - If `true`: `router.replace('/login')`
- Cleanup on unmount

### Updated: `src/app/(auth)/verify-email/page.tsx`
Pass `email={validEmail}` (or `email={email!}`) to all `<ResendForm>` instances. The `validEmail` string is already available at each render path.

---

## Part 3 — SessionGuard for /profile

### New file: `src/shared/components/SessionGuard.tsx`
```tsx
'use client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  return <>{children}</>;
}
```

### Updated: `src/app/(main)/profile/layout.tsx`
Wrap the returned JSX with `<SessionGuard>`. The existing server-side `auth()` check stays — it handles the initial page load. `SessionGuard` handles the cross-tab case after page load.

**Not** added to `(main)/layout.tsx` — the catalog and other public routes don't need a session.

---

## Data flow

```
Tab B verifies email
  └─ /api/auth/verify sets emailVerified in DB
  └─ redirects to /login

Tab A (/verify-email) gains focus
  └─ visibilitychange fires
  └─ checkEmailVerifiedAction(email) → true
  └─ router.replace('/login')

Tab B logs out
  └─ signOut() clears session cookie

Tab A (/profile) gains focus
  └─ SessionProvider refetchOnWindowFocus re-fetches session
  └─ status becomes 'unauthenticated'
  └─ SessionGuard → router.replace('/login')
```

---

## Tests

- `ResendForm.test.tsx`: add test — mock `visibilitychange` event + `checkEmailVerifiedAction` returning `true` → assert `router.replace('/login')` called
- `SessionGuard.test.tsx`: test — `useSession` returns `unauthenticated` → assert `router.replace('/login')` called; `authenticated` → no redirect
- `actions.test.ts`: add test for `checkEmailVerifiedAction` — verified user returns `true`, unverified returns `false`, missing user returns `false`

---

## Files changed

**feature/auth-redesign (before merge):**
- `src/features/auth/actions.ts` — fix resend redirect

**feature/cross-tab-auth-sync (new branch from main after auth-redesign merge):**
- `src/app/layout.tsx` — add `<Providers>`
- `src/shared/components/Providers.tsx` — new
- `src/features/auth/actions.ts` — add `checkEmailVerifiedAction`
- `src/app/(auth)/verify-email/ResendForm.tsx` — add `email` prop + visibilitychange
- `src/app/(auth)/verify-email/page.tsx` — pass `email` to `ResendForm`
- `src/shared/components/SessionGuard.tsx` — new
- `src/app/(main)/profile/layout.tsx` — add `SessionGuard`
- Tests for all new logic
