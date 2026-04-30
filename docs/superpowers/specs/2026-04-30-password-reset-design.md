# Password Reset Design

## Goal

Allow users with credentials accounts to reset their password via email link. Unknown emails get the same response as known ones — no account existence leak.

## Architecture

### New Prisma model

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

One token per email at a time. On repeat requests the old token is deleted first.

### New files

| File                                                    | Role                                                                                   |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/features/auth/lib/reset-tokens.ts`                 | `generateResetToken`, `findResetToken`, `deleteResetToken`, `deleteResetTokensByEmail` |
| `src/features/auth/lib/reset-email.ts`                  | `sendPasswordResetEmail`                                                               |
| `src/features/auth/actions.ts`                          | Add `forgotPasswordAction`, `resetPasswordAction`                                      |
| `src/app/(auth)/forgot-password/page.tsx`               | RSC wrapper → `<ForgotPasswordForm />`                                                 |
| `src/app/(auth)/forgot-password/ForgotPasswordForm.tsx` | Client form                                                                            |
| `src/app/(auth)/reset-password/page.tsx`                | RSC: validates token server-side → `<ResetPasswordForm token={token} />` or redirect   |
| `src/app/(auth)/reset-password/ResetPasswordForm.tsx`   | Client form                                                                            |

### Reuses existing

- `src/app/(auth)/layout.tsx` — editorial two-panel layout, no changes needed
- `src/features/auth/lib/validation.ts` — `applyPasswordComplexity` reused in reset schema
- `src/features/auth/lib/email.ts` pattern — same Resend + `RESEND_FROM` env var

---

## Flow

```
/forgot-password
  └─ user submits email
       ├─ email not in DB → same success response (no leak)
       └─ email in DB
            ├─ delete old PasswordResetToken for this email (if any)
            ├─ create new token (UUID, 1h TTL)
            ├─ send email with /reset-password?token=<uuid>
            └─ redirect /forgot-password?sent=true

/reset-password?token=<uuid>   (RSC)
  ├─ token not found or expiresAt < now → redirect /forgot-password?expired=true
  └─ token valid → render <ResetPasswordForm token={token} />
       └─ user submits new password
            ├─ re-validate token server-side (race condition guard)
            ├─ bcrypt.hash(newPassword, 10)
            ├─ prisma.user.update password
            ├─ deleteResetToken(token)
            └─ redirect /login?reset=true

/login?reset=true
  └─ LoginForm shows "Password updated — please sign in." banner
```

---

## Actions

### `forgotPasswordAction(email: string)`

1. Validate email format with Zod
2. Look up user by email
3. If user not found → do nothing (no error returned)
4. If user found but has no password (`user.password === null`) → do nothing (OAuth-only account; sending a reset would be confusing and enable credential takeover)
5. Delete existing reset tokens for this email
6. Generate token, set `expiresAt = now + 1h`
7. Send email (fire-and-forget errors — log but don't surface to user)
8. Return `{ sent: true }` regardless

### `resetPasswordAction(token: string, newPassword: string)`

1. Validate `newPassword` with `applyPasswordComplexity`
2. Find token in DB — if missing return `{ error: 'invalid' }`
3. Check `expiresAt > now` — if expired return `{ error: 'expired' }`
4. Hash password, update user, delete token
5. Return `{ success: true }`

---

## UI

**`ForgotPasswordForm`**

- Single email input + submit button
- On `?sent=true`: shows confirmation panel instead of form ("Check your inbox — if that address is registered, a reset link is on its way.")
- On `?expired=true`: shows inline notice "That link has expired. Enter your email to get a new one." above the form
- Link back to `/login`

**`ResetPasswordForm`**

- Two fields: new password + confirm password (client-side match validation)
- Password field reuses `PasswordInput` component (show/hide toggle, caps lock warning)
- Complexity requirements shown inline (same pattern as SignupForm)
- On submit: calls `resetPasswordAction`, handles `{ error: 'invalid' | 'expired' }` with inline messages
- On success: `router.push('/login?reset=true')`

**`LoginForm`**

- Reads `?reset=true` from `useSearchParams`
- Renders a one-line success banner above the form: "Password updated — please sign in."

---

## Error handling

| Scenario                       | Handling                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| Email not in DB                | Silent — same `{ sent: true }` response                                                        |
| OAuth user (no password)       | Silent — same response, no token created                                                       |
| Token expired (page load)      | RSC redirects → `/forgot-password?expired=true`                                                |
| Token expired (race on submit) | `resetPasswordAction` returns `{ error: 'expired' }` → inline message                          |
| Token not found (submit)       | `resetPasswordAction` returns `{ error: 'invalid' }` → inline message                          |
| Email send failure             | Logged, token deleted, user sees same success message (not ideal but avoids leaking internals) |
| Passwords don't match          | Client-side RHF validation, never reaches server                                               |

---

## Testing

- `reset-tokens.ts` — unit tests: generate creates record with correct TTL; find returns null for expired/missing; delete removes record; deleteByEmail removes all for that email
- `reset-email.ts` — unit test: calls Resend with correct subject + URL; throws on Resend error
- `actions.ts` — unit tests: `forgotPasswordAction` silent on unknown email; creates token and sends email on known email; `resetPasswordAction` returns error on expired/missing token; updates password and deletes token on success
- `ForgotPasswordForm` — renders form; shows confirmation panel on `?sent=true`; shows expired notice on `?expired=true`
- `ResetPasswordForm` — shows password mismatch error; calls action on valid submit
- `LoginForm` — shows reset banner on `?reset=true`
