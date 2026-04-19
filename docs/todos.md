# Project TODOs

## Security

### Auth guards in Server Actions (before connecting to routes)

**`src/features/admin/actions.ts`**
- `createMoveAction` and `deleteMoveAction` have no role check
- Fix: add `auth()` from `@/shared/lib/auth` + verify `session.user.role === 'ADMIN'` at the top of each action
- Priority: must fix before admin routes go live

**`src/features/profile/actions.ts`**
- `updateProgressAction` takes `userId` as a parameter — caller could pass any userId
- Fix: remove `userId` param, get it from `auth()` session instead
- Priority: must fix before profile routes go live

### Auth rate limiting (post-MVP)
- No rate limiting on `/api/auth/signin` — brute force possible
- No rate limiting on signup — email bombing possible
- Fix: add rate limiting middleware (e.g. Upstash Ratelimit) before public launch

### Auth edge cases (post-MVP)
- OAuth user tries to login via credentials (no password set) — returns generic error, no helpful message
- Expired session doesn't preserve `callbackUrl` on redirect to login
- No account lockout after N failed login attempts

### Timing oracle in email verification (post-MVP)
- `src/app/api/auth/verify/route.ts` — expired token branch does an extra DB delete before redirecting; missing token returns immediately. An attacker can distinguish "token never existed" from "token existed but expired" by response time.
- Fix: add artificial delay or consolidate both cases to the same response path

### Email in verification URL (post-MVP)
- `src/app/api/auth/verify/route.ts` passes `email` as a plain query param (`?error=expired&email=...`)
- Email appears in server logs, referrer headers, and analytics tools
- Fix: remove email from URL and prompt the user to re-enter it on the expired page, OR accept the trade-off and document it

### ~~Proxy matcher scope (minor)~~ ✅ Resolved (2026-04-19)
- ~~`src/proxy.ts` matcher runs on every route; only `/profile` and `/admin` are actually protected~~
- ~~Fix: narrow matcher to `['/profile/:path*', '/admin/:path*']` for explicitness, or keep broad if adding more protected routes soon~~
- Narrowed to `['/profile/:path*', '/admin/:path*']`; `getProtectedRedirect` extracted for testability; 5 unit tests added

### Email sender domain (post-MVP)
- `src/features/auth/lib/email.ts` uses `onboarding@resend.dev` (Resend shared test domain)
- Fix: configure a verified sender domain in Resend and update the FROM constant before production launch

## UX / Validation

~~**`src/features/auth/components/SignupForm.tsx`**~~ ✅ Resolved (2026-04-19)
- ~~`name` field uses Zod defaults (`"String must contain at least 2 character(s)"`) — inconsistent with password field which has a custom message~~
- ~~Fix: add `.min(2, 'Name must be at least 2 characters')` and `.max(50, 'Name is too long')` to `signupSchema.name`~~
- `signupSchema.name` now uses custom messages; consistent with `password` field

~~**`src/features/auth/components/SignupForm.test.tsx`**~~ ✅ Resolved (2026-04-19)
- ~~`name` field validation is not tested (empty name, name < 2 chars)~~
- ~~Fix: add a test case for short/empty name before shipping to production~~
- 3 tests added: 2 in `validation.test.ts` (min/max message strings), 1 in `SignupForm.test.tsx` (UI render)
**`src/features/auth/components/SignupForm.tsx`**
- `name` field uses Zod defaults (`"String must contain at least 2 character(s)"`) — inconsistent with password field which has a custom message
- Fix: add `.min(2, 'Name must be at least 2 characters')` and `.max(50, 'Name is too long')` to `signupSchema.name`

**`src/features/auth/components/SignupForm.test.tsx`**
- `name` field validation is not tested (empty name, name < 2 chars)
- Fix: add a test case for short/empty name before shipping to production

## Feature Gaps

**`src/features/catalog/actions.ts`**
- `getMovesAction` ignores `filters.tags` — tag-based filtering not implemented
- `MoveFilters.tags` field in `src/shared/types/index.ts` is misleadingly present
- Fix: implement tag filter OR remove the field from MoveFilters until needed

**`src/features/auth/actions.ts`**
- `signupAction` doesn't return the created user
- Fix: return `prisma.user.create(...)` result if callers need the user ID

## Architecture Notes

**`src/app/(main)/catalog/page.tsx`**
- When filling in UI, call `getMovesAction` directly in the Server Component — do NOT fetch via `/api/moves`
- Fetching your own API route from a Server Component is an RSC anti-pattern (unnecessary network hop)

## Infrastructure

~~**Neon DB not connected**~~ ✅ Resolved — DB connected, schema pushed (2026-04-19)
