# Header User Menu — Design Spec

**Date:** 2026-04-22
**Scope:** Replace static account icon link in Header with an interactive dropdown menu (Radix DropdownMenu + AlertDialog).

---

## Goal

Give users a contextual account menu in the header that shows available profile actions. Unauthenticated users see the same structure but with items disabled — making the app's features discoverable without being confusing.

---

## Architecture

**New packages** (both `--save-exact`):

- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-alert-dialog`

**New files:**

- `src/shared/components/ui/dropdown-menu.tsx` — Radix DropdownMenu primitives (same pattern as `accordion.tsx`)
- `src/shared/components/ui/alert-dialog.tsx` — Radix AlertDialog primitives
- `src/shared/components/UserMenu.tsx` — Client Component, all dropdown logic
- `src/shared/lib/auth-actions.ts` — Server Action `signOutAction()` wrapping NextAuth `signOut`

**Modified files:**

- `src/shared/components/Header.tsx` — pass `user: { name: string | null; image: string | null } | null` to `UserMenu`

**Data flow:**

- `Header` (Server Component) calls `auth()`, extracts `name` and `image` from session, passes as props to `UserMenu`
- `UserMenu` (Client Component) renders the trigger icon and dropdown
- Log out confirmation calls `signOutAction()` Server Action → redirects to `/`

---

## UserMenu Behaviour

### Trigger

Always an account SVG icon button (same icon as current header). Click toggles the dropdown open/closed. Click outside also closes.

### Dropdown — not authenticated (`user === null`)

```
Profile      [disabled, opacity-50]
Settings     [disabled, opacity-50]
─────────────────────────────────
Log in       [active → /login]
```

### Dropdown — authenticated (`user !== null`)

```
[avatar or initial]  Name        ← non-interactive header
─────────────────────────────────
Profile              [→ /profile]
Settings             [→ /profile/settings]
─────────────────────────────────
Log out              [opens AlertDialog]
```

**Avatar header:** if `image` is set, render `<Image>` in a circle; otherwise render the first letter of `name` (or `?` fallback) in a styled circle using `bg-primary-container`.

---

## AlertDialog — Log Out Confirmation

Triggered by clicking "Log out" in the dropdown. Dropdown closes when dialog opens.

```
┌─────────────────────────┐
│  Log out?               │
│                         │
│  You'll need to sign    │
│  back in to access      │
│  your profile.          │
│                         │
│  [Cancel]   [Log out]   │
└─────────────────────────┘
```

- **Cancel** — closes dialog, no action
- **Log out** — destructive variant, calls `signOutAction()` → redirect to `/`

---

## Styling

Follows existing design system tokens:

| Element                    | Token                                                                         |
| -------------------------- | ----------------------------------------------------------------------------- |
| Dropdown panel             | `bg-surface-container`, `rounded-xl`, `border border-outline-variant`, shadow |
| Active item hover          | `bg-accent` (`surface-container-high`)                                        |
| Disabled items             | `opacity-50`, `cursor-not-allowed`, `pointer-events-none`                     |
| Separator                  | `bg-outline-variant`                                                          |
| Avatar fallback            | `bg-primary-container text-on-surface`                                        |
| Log out item               | `text-destructive`                                                            |
| AlertDialog confirm button | `variant="destructive"`                                                       |

---

## Testing

**TDD for `UserMenu`:**

- Renders account icon trigger
- Unauthenticated: Profile and Settings items are disabled, Log in is active
- Authenticated: shows user name in header, Profile/Settings active, Log out present
- Log out click opens confirmation dialog
- Cancel closes dialog without signing out
- Confirm calls `signOutAction`

**`signOutAction`:**

- Calls NextAuth `signOut` with `redirectTo: '/'`
- No unit test needed (thin wrapper over NextAuth)

**Existing `Header.test.tsx`:** update to reflect new structure (no longer a bare link, now renders `UserMenu`).

---

## Out of Scope

- Notification badge on the icon
- Keyboard shortcut to open menu
- "Sign up" option in the unauthenticated dropdown
- Deferred auth (redirect-after-login) for disabled items
