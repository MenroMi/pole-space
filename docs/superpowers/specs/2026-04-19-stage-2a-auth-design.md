# Stage 2A: Authentication Design

**Date:** 2026-04-19  
**Status:** Approved

---

## Overview

Implement full authentication for the Pole Dance Catalog app: signup with email verification, login with credentials (email+password), OAuth (Google + Facebook), route protection middleware, and redirect logic.

---

## Scope

- Email/password signup → email verification via Resend → login
- Google + Facebook OAuth (already configured in NextAuth)
- Route protection: `/profile` and `/admin` require auth, everything else is public
- Redirect to `/catalog` after successful login
- React Hook Form + Zod for all forms (foundation for future complex forms)

---

## Auth Flow

### Signup

1. User submits `SignupForm` (name, email, password)
2. Client-side validation via Zod + React Hook Form
3. `signupAction` called:
   - Validate with Zod on server
   - Check email not already in use
   - Create `User` with `emailVerified=null` and hashed password
   - Generate `VerificationToken` (crypto UUID, expires in 24h)
   - Send verification email via Resend
   - If Resend fails → delete the created user (no orphaned unverified users)
4. Redirect to `/auth/verify-email?sent=true` (shows "check your email" message)

### Email Verification

1. User clicks link: `/api/auth/verify?token=xxx`
2. Route handler:
   - Find token in DB
   - If not found → redirect `/auth/verify-email?error=invalid`
   - If expired → delete token, redirect `/auth/verify-email?error=expired`
   - If valid → set `User.emailVerified = now()`, delete token
   - Redirect `/login?verified=true`

### Resend Verification Email

1. `/auth/verify-email` page shows "Resend email" button if `?error=expired`
2. `resendVerificationAction(email)`:
   - Check user exists and is not yet verified
   - Delete old tokens for this user
   - Generate new token, send email
3. Redirect back to `/auth/verify-email?sent=true`

### Login (Credentials)

1. User submits `LoginForm` (email, password)
2. NextAuth `authorize()`:
   - Find user by email
   - If `emailVerified === null` → throw `"Please verify your email first"`
   - Compare password with bcrypt
   - If invalid → return null (NextAuth shows generic error)
3. On success → redirect `/catalog`

### OAuth (Google / Facebook)

- Already configured in `auth.ts`
- No email verification needed (OAuth providers guarantee email ownership)
- On success → redirect `/catalog`

---

## File Structure

```
src/
  features/auth/
    components/
      LoginForm.tsx           # RHF + Zod, client component
      SignupForm.tsx           # RHF + Zod, client component
    lib/
      tokens.ts               # generateVerificationToken(), deleteVerificationToken()
      email.ts                # sendVerificationEmail() via Resend
      validation.ts           # Zod schemas: loginSchema, signupSchema
    actions.ts                # signupAction, resendVerificationAction (update existing)
    index.ts                  # update exports

  app/
    (auth)/
      login/page.tsx          # uses LoginForm
      signup/page.tsx         # uses SignupForm
      verify-email/page.tsx   # shows sent/error/expired states
    api/
      auth/
        verify/route.ts       # GET ?token= handler

  middleware.ts               # protects /profile and /admin
```

---

## Validation Schemas

```ts
// loginSchema
email: z.string().email()
password: z.string().min(1, 'Required')

// signupSchema
name: z.string().min(2).max(50)
email: z.string().email()
password: z.string().min(8).max(100)
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| Email already in use | `signupAction` returns `{ error: 'Email already in use' }` |
| Resend API fails | Delete user, return `{ error: 'Failed to send email, please try again' }` |
| Token invalid/not found | Redirect `/auth/verify-email?error=invalid` |
| Token expired | Delete token, redirect `/auth/verify-email?error=expired` |
| Email not verified on login | NextAuth throws, shown as form error |
| Wrong password | NextAuth returns null → generic "Invalid credentials" |

---

## Tech Stack Additions

| Package | Purpose |
|---|---|
| `resend` | Email sending |
| `react-hook-form` | Form state + client validation |
| `zod` | Schema validation (client + server) |
| `@hookform/resolvers` | RHF + Zod integration |

All versions to be pinned.

---

## Route Protection (middleware.ts)

```ts
// Protected routes
const protectedRoutes = ['/profile', '/admin']

// If no session → redirect to /login?callbackUrl=<current>
// All other routes → public
```

---

## Testing

| Unit | What |
|---|---|
| `tokens.ts` | Token generation uniqueness, deletion |
| `validation.ts` | Valid/invalid inputs for both schemas |
| `email.ts` | Resend called with correct params (vi.mock) |

| Integration | What |
|---|---|
| `signupAction` | Duplicate email error, Resend fail → user deleted |
| `resendVerificationAction` | Old tokens deleted, new token created |

| Manual | What |
|---|---|
| Middleware | Protected routes redirect when unauthenticated |
| Full signup → verify → login flow | Happy path |

---

## Known Deferred Issues (in docs/todos.md)

- Rate limiting on login and signup endpoints
- OAuth user attempting credentials login (unhelpful error)
- Expired session not preserving `callbackUrl`
- Account lockout after N failed attempts
