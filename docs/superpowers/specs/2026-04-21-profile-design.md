# Stage 2C — Profile Page Design

**Date:** 2026-04-21
**Scope:** Profile section (`/profile/*`) — progress tracking, favourites scaffold, profile settings

---

## Overview

The profile section is a multi-route dashboard with a persistent aside navigation. Stage 2C delivers:

- `/profile` — Overview dashboard with progress and favourites widgets
- `/profile/progress` — Full progress list with status management
- `/profile/favourite-moves` — Favourites list (empty state in 2C; populated in Stage 2D)
- `/profile/settings` — Edit name, avatar, password

Favourites are a separate concept from progress. The `UserFavourite` Prisma model is introduced in Stage 2C so Stage 2D (Move Detail page) only needs UI, not migrations.

---

## Routing & File Structure

```
src/app/(main)/profile/
├── layout.tsx                  ← aside nav + {children}, Server Component
├── page.tsx                    ← Overview dashboard, Server Component
├── progress/
│   └── page.tsx                ← Full progress list, Server Component
├── favourite-moves/
│   └── page.tsx                ← Favourites list, Server Component
└── settings/
    └── page.tsx                ← Settings page, Server Component

src/features/profile/
├── actions.ts                  ← all server actions
├── actions.test.ts
├── components/
│   ├── ProfileAside.tsx        ← Client Component (usePathname for active link)
│   ├── ProfileOverview.tsx     ← Server Component, widget grid
│   ├── ProgressWidget.tsx      ← Server Component, last 5 IN_PROGRESS moves
│   ├── FavouritesWidget.tsx    ← Server Component, empty state placeholder
│   ├── ProgressCard.tsx        ← Client Component, move card with status picker
│   ├── ProgressStatusPicker.tsx ← Client Component, 3 status buttons
│   ├── SettingsForm.tsx        ← Client Component, RHF + Zod
│   └── AvatarUpload.tsx        ← Client Component, file input + Cloudinary upload
├── types.ts                    ← + ProfileFormValues, ChangePasswordValues, FavouriteWithMove
└── index.ts
```

---

## Data Layer

### Prisma — new model

```prisma
model UserFavourite {
  id        String   @id @default(cuid())
  userId    String
  moveId    String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  move      Move     @relation(fields: [moveId], references: [id], onDelete: Cascade)

  @@unique([userId, moveId])
}
```

Add `favourites UserFavourite[]` relation to `User` and `Move` models.

### Server Actions (`'use server'`, all require `requireAuth()`)

| Action                                                   | Input                              | Returns                         |
| -------------------------------------------------------- | ---------------------------------- | ------------------------------- |
| `getUserProgressAction()`                                | —                                  | `ProgressWithMove[]` (existing) |
| `updateProgressAction(moveId, status)`                   | `string, LearnStatus`              | `{ success, error }` (existing) |
| `updateProfileAction({ name })`                          | `{ name: string }`                 | `{ success, error }`            |
| `uploadAvatarAction(formData)`                           | `FormData`                         | `{ success, imageUrl, error }`  |
| `changePasswordAction({ currentPassword, newPassword })` | `{ currentPassword, newPassword }` | `{ success, error }`            |
| `addFavouriteAction(moveId)`                             | `string`                           | `{ success, error }`            |
| `removeFavouriteAction(moveId)`                          | `string`                           | `{ success, error }`            |
| `getUserFavouritesAction()`                              | —                                  | `FavouriteWithMove[]`           |

`uploadAvatarAction` validates: file type must be `image/*`, max size 5MB — server-side. Returns `{ error: 'Only image files are allowed' }` or `{ error: 'File size must be under 5MB' }` on failure.

---

## Components

### `layout.tsx`

Server Component. Fetches session for user name + image. Renders `<ProfileAside name image />` + `{children}` using `PageShell` with aside prop (same pattern as catalog).

### `ProfileAside`

Client Component. Nav links: Overview / Progress / Favourite Moves / Settings. `usePathname()` highlights active link. Displays avatar + user name at the top (received as props from layout).

### `page.tsx` (Overview)

Server Component. Renders `<ProfileOverview />`.

### `ProfileOverview`

Server Component. Two widgets in a grid:

- `ProgressWidget` — fetches `getUserProgressAction()`, shows up to 5 moves with `IN_PROGRESS` status, "View all →" link to `/profile/progress`
- `FavouritesWidget` — empty state: "Add favourites from move pages" (activates in Stage 2D)

### `progress/page.tsx`

Server Component. Fetches full progress. Renders list of `ProgressCard`. Empty state: "No moves tracked yet. Browse the catalog to get started."

### `ProgressCard`

Client Component. Move image (or `ImageOff` fallback, same as catalog) + title + difficulty badge + `ProgressStatusPicker`. Status change calls `updateProgressAction` via `useTransition` (pending state on active button, no optimistic update needed).

### `ProgressStatusPicker`

Client Component. Three shadcn `Button` components: WANT TO LEARN / IN PROGRESS / LEARNED. Active status: `variant="default"` (`bg-primary`). Inactive: `variant="ghost"`.

### `favourite-moves/page.tsx`

Server Component. Fetches `getUserFavouritesAction()`. Renders move cards with remove button. In Stage 2C always shows empty state (no way to add favourites yet).

### `settings/page.tsx`

Server Component. Fetches user (`name`, `image`, `password !== null`). Passes `hasPassword: boolean` to `SettingsForm`.

### `SettingsForm`

Client Component. RHF + Zod. Three independent sections, each with its own submit:

1. **Name** — text input, min 2 / max 50 chars
2. **Avatar** — `AvatarUpload` component
3. **Change password** — rendered only if `hasPassword === true` (hidden for OAuth users, no explanation shown)

Success: toast notification. Error: inline field error.

### `AvatarUpload`

Client Component. File input → client-side preview → `uploadAvatarAction(formData)`. Accepts `image/*` only, enforces 5MB limit client-side (mirrored server-side).

---

## Error Handling

- All actions return `{ success: boolean, error?: string }` — no thrown exceptions in UI layer
- `changePasswordAction`: bcrypt compare fails → `{ error: 'Current password is incorrect' }`
- `uploadAvatarAction`: invalid type → `{ error: 'Only image files are allowed' }`; oversized → `{ error: 'File size must be under 5MB' }`
- OAuth users: password section not rendered (no error, no message)
- **Session refresh:** After `updateProfileAction` and `uploadAvatarAction` succeed, client must call NextAuth v5 `update()` (from `useSession`) to refresh session so Header reflects updated name/avatar without a full page reload

---

## Testing

Unit tests (Vitest):

**Actions (`actions.test.ts`):**

- `updateProfileAction` — updates name; rejects unauthenticated
- `changePasswordAction` — correct password succeeds; wrong password returns error; rejects unauthenticated
- `addFavouriteAction` — creates record (idempotent: upsert, duplicate returns `{ success: true }`); rejects unauthenticated
- `removeFavouriteAction` — deletes record; rejects unauthenticated
- `getUserFavouritesAction` — returns favourites with move; rejects unauthenticated

**Components:**

- `ProgressStatusPicker` — renders three buttons; active button has correct variant; click triggers callback
- `SettingsForm` — Zod validation: empty name, name too short, password mismatch, password too short

---

## Out of Scope (Stage 2C)

- Adding favourites from the UI (comes in Stage 2D with Move Detail page)
- Email change (post-MVP, requires re-verification flow)
- Account deletion
- Progress statistics / charts
- Filtering or sorting on `/profile/progress`
