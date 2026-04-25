# Profile Settings Redesign — Design Spec

## Goal

Redesign `/profile/settings` to match the Stitch "Profile: Settings (Dark)" screen: bento grid layout, split name into firstName/lastName/username, show email, unified Save Changes + Discard actions.

## Architecture

Single `SettingsForm` client component with two RHF sub-forms (profile + password), coordinated by one submit handler. Server actions remain separate and focused. DB schema removes `name`, adds `firstName`, `lastName`, `username`.

## DB Changes

**Remove** `name String?` from User model.

**Add:**
- `firstName String?`
- `lastName String?`
- `username String? @unique`

Migration (ordered to preserve data):
1. `ALTER TABLE "User" ADD COLUMN "firstName" TEXT;`
2. `ALTER TABLE "User" ADD COLUMN "lastName" TEXT;`
3. `ALTER TABLE "User" ADD COLUMN "username" TEXT;`
4. `UPDATE "User" SET "firstName" = "name" WHERE "name" IS NOT NULL;` — preserve existing display names
5. `ALTER TABLE "User" DROP COLUMN "name";`
6. `CREATE UNIQUE INDEX ON "User"("username") WHERE "username" IS NOT NULL;`

## Auth Callback

In `auth.config.ts` JWT callback, build `token.name` from DB fields:

```ts
token.name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
```

Session callback propagates `token.name` to `session.user.name` unchanged (existing behaviour). No type changes needed — `session.user.name` stays `string | null | undefined`.

## Actions

### `updateProfileAction`

**Input:** `{ firstName?: string; lastName?: string; username?: string; location?: string }`

**Validation (Zod):**
- `firstName`: string, min 1, max 50, optional
- `lastName`: string, min 1, max 50, optional
- `username`: string, min 2, max 30, lowercase alphanumeric + underscore, optional
- `location`: string, min 1, max 100, optional

**Error handling:** Catch Prisma `P2002` unique constraint on `username` → return `{ success: false, field: 'username', error: 'Username already taken' }`.

**Returns:** `{ success: true }` or `{ success: false, field?: string, error: string }`

### `changePasswordAction`

No changes — existing implementation is correct.

### `getProfileUserAction`

Update select to return `firstName`, `lastName`, `username`, `image`, `location`, `createdAt`. Remove `name`.

## Settings Page (`settings/page.tsx`)

Fetch user via `getProfileUserAction`. Email from `session.user.email` (no extra DB query). Pass all fields to `SettingsForm`.

## SettingsForm Layout

Bento grid: `grid grid-cols-1 md:grid-cols-12 gap-8`. Keeps existing `Input` component (full border, no style change). Existing `PasswordField` component reused for Security section.

**Row 1:**

Profile block (`md:col-span-4`, `bg-surface-low rounded-2xl p-8`):
- `AvatarUpload` centered
- Display name: `firstName lastName` (or whichever is set), falls back to `'anonymous'`
- Email: `session.user.email` (read-only, `text-on-surface-variant`)
- Elite Member badge (same stub as ProfileHero)

Personal Information (`md:col-span-8`, `bg-surface-low rounded-2xl p-8`):
- Section header: `<User />` icon + "Personal Information" + `border-b` separator
- Sub-grid `grid-cols-2`: First Name + Last Name
- Username (full width, `col-span-2`)
- Location (full width, `col-span-2`)

**Row 2:**

Security (`md:col-span-12`, `bg-surface-low rounded-2xl p-8`):
- Section header: `<Lock />` icon + "Security" + `border-b` separator
- Current Password, New Password, Confirm Password (existing `PasswordField`)

**Row 3:**

Actions (`md:col-span-12`, right-aligned, `flex justify-end gap-4`):
- **Discard** — outline button: `profileForm.reset()` + `passwordForm.reset()` + `router.push('/profile')`
- **Save Changes** — kinetic-gradient button: submit handler

## Submit Handler

```ts
async function handleSave() {
  // 1. Always save profile
  const profileResult = await updateProfileAction(profileValues);
  if (!profileResult.success) { /* set field errors */ return; }

  // 2. Save password only if any field is non-empty
  const anyPasswordField = currentPassword || newPassword || confirmPassword;
  if (anyPasswordField) {
    const passwordResult = await changePasswordAction(passwordValues);
    if (!passwordResult.success) { /* set field errors */ return; }
  }

  router.push('/profile');
}
```

On full success: redirect to `/profile` (no separate success toast needed — the redirect is the confirmation).

## Error Display

- Profile errors: inline under each field (RHF `formState.errors`)
- Username taken: `profileForm.setError('username', { message: 'Username already taken' })`
- Password errors: inline under each field
- Section-level errors (generic action failure): small `text-destructive` paragraph under the section header

## Affected Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Remove `name`, add `firstName`, `lastName`, `username` |
| `prisma/migrations/…` | New migration SQL |
| `src/shared/lib/auth.config.ts` | JWT callback builds `token.name` from firstName + lastName |
| `src/features/profile/actions.ts` | `updateProfileAction` new fields + P2002, `getProfileUserAction` new select |
| `src/features/profile/actions.test.ts` | New field tests, P2002 test, updated mocks |
| `src/features/profile/components/ProfileHero.tsx` | `name` prop → `firstName` + `lastName` |
| `src/features/profile/components/ProfileOverview.tsx` | Pass firstName + lastName to ProfileHero |
| `src/app/(main)/profile/settings/page.tsx` | Fetch new fields, pass email |
| `src/features/profile/components/SettingsForm.tsx` | Full redesign — bento layout, new fields |
| `src/features/profile/components/SettingsForm.test.tsx` | New field tests, Discard redirect test |

## Tech Debt

- Preferences section (High-Contrast Videos, Autoplay Tutorials) skipped — document in `docs/todos.md`
- Elite Member badge in Profile block remains a stub (same as ProfileHero)

## Tasks

1. DB migration — remove `name`, add `firstName`, `lastName`, `username @unique`
2. Auth callback — build `token.name` from firstName + lastName; update `getProfileUserAction` select; update `ProfileHero` + `ProfileOverview` props
3. `updateProfileAction` — new Zod schema, new fields, P2002 handling; update `actions.test.ts`
4. Redesign `SettingsForm` — bento layout, profile block, personal info, security, actions
5. Update `settings/page.tsx` — new fields, email from session
6. Update `SettingsForm.test.tsx` — new fields, Discard redirect, password-skip behaviour
7. Tech debt entry for Preferences section + manual e2e cases
