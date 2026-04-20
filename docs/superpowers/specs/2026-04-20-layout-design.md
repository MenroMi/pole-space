# Layout Design — Kinetic Gallery

## Overview

Two separate layouts: `(main)` for authenticated/catalog pages and `(auth)` for authentication pages. The main layout uses a PageShell component pattern so each page controls its own aside content.

---

## 1. Architecture

**Approach: PageShell component (Approach B)**

- `(main)/layout.tsx` — renders `<Header>`, `{children}`, `<Footer>`. No aside here.
- `(auth)/layout.tsx` — standalone centered wrapper. No Header/Footer.
- `src/shared/components/PageShell.tsx` — CSS Grid shell accepting `aside` and `children` props. Pages that need an aside wrap their content in it.
- `src/shared/components/Header.tsx` — glassmorphic sticky header (RSC, reads session via `auth()`).
- `src/shared/components/Footer.tsx` — bottom nav footer.

Usage on a page:
```tsx
// (main)/catalog/page.tsx
export default function CatalogPage() {
  return (
    <PageShell aside={<CatalogFilters />}>
      <MoveGrid />
    </PageShell>
  )
}
```

Pages without an aside (e.g. future landing) render `{children}` directly without wrapping in `PageShell`.

---

## 2. Main Layout — `(main)/layout.tsx`

Renders:
```
<Header />
{children}   ← page content (may or may not use PageShell)
<Footer />
```

No grid structure at this level — grid lives inside `PageShell`.

---

## 3. Header

**Files:** `src/shared/components/Header.tsx` + `src/shared/components/HeaderNav.tsx`

`Header.tsx` — Server Component:
- Reads session via `auth()` to determine account icon link (`/profile` or `/login`)
- `position: sticky; top: 0; z-index: 50`
- Background: `surface` (#131313) at 70% opacity + `backdrop-filter: blur(20px)` (glassmorphism rule)
- **Left:** "kinetic gallery" wordmark — Space Grotesk, lowercase, links to `/`
- **Center:** `<HeaderNav />` (client sub-component, see below)
- **Right:** Search icon (decorative for now) + account icon — `href` passed as prop from session check
- No explicit border — separation achieved by glassmorphism alone (No-Line rule)

`HeaderNav.tsx` — Client Component (`'use client'`):
- Uses `usePathname()` to highlight the active link
- Nav links: `Catalog` → `/catalog`, `Moves` → `/moves`
- Active link styled with `primary` (#dcb8ff) color

---

## 4. PageShell

**File:** `src/shared/components/PageShell.tsx`

```tsx
interface PageShellProps {
  aside: React.ReactNode
  children: React.ReactNode
}
```

- CSS Grid: `grid-cols-[260px_1fr]`
- `min-h-[calc(100vh-header-height-footer-height)]`
- **Aside column:** background `surface-container-low` (#1b1b1b), no border — tonal separation only
- **Main column:** background `surface` (#131313)
- Mobile: aside hidden (`hidden md:grid`) — out of scope for this stage

---

## 5. Footer

**File:** `src/shared/components/Footer.tsx`

- Client Component (needs `usePathname` for active state on nav icons)
- Background: `surface-container-lowest` (#0e0e0e)
- Nav icons: Gallery → `/catalog`, Moves → `/moves`, Profile → `/profile`
- Right side: "kinetic gallery v.0.1" label text (Manrope, Label-MD style: all-caps, 0.05rem letter-spacing)
- No border at top — `surface-container-lowest` is darker than `surface`, creates natural separation

---

## 6. Auth Layout — `(auth)/layout.tsx`

- `min-h-screen`, background `surface` (#131313)
- Flex column, items centered both axes
- Top: "kinetic gallery" wordmark (Space Grotesk, lowercase) — links to `/`
- Below wordmark: tagline text (Manrope, body size)
- `{children}` renders the form card — background `surface-container` (#1f1f1f), rounded, padding

No Header, no Footer, no aside.

---

## 7. Design Tokens Used

All colors from the Stitch design system:

| Token | Value | Usage |
|-------|-------|-------|
| `surface` | #131313 | Main canvas, auth background |
| `surface-container-low` | #1b1b1b | Aside background |
| `surface-container` | #1f1f1f | Auth card background |
| `surface-container-lowest` | #0e0e0e | Footer background |
| `on-surface` | #e2e2e2 | Body text (never pure white) |
| `primary` | #dcb8ff | Active nav links, accents |
| `outline-variant` | #4b4450 | Ghost borders at 15% opacity if needed |

Typography:
- Wordmark + nav labels: Space Grotesk
- Body + footer label: Manrope

---

## 8. Files Created / Modified

| File | Action |
|------|--------|
| `src/app/(main)/layout.tsx` | Create |
| `src/app/(auth)/layout.tsx` | Create |
| `src/shared/components/Header.tsx` | Create |
| `src/shared/components/HeaderNav.tsx` | Create |
| `src/shared/components/Footer.tsx` | Create |
| `src/shared/components/PageShell.tsx` | Create |
| `src/app/globals.css` | Modify — add font imports (Space Grotesk, Manrope), CSS custom properties for design tokens |
| `src/app/layout.tsx` | Modify — update font variables |

---

## 9. Out of Scope

- Mobile responsive aside (collapse/drawer) — post-MVP
- Search functionality — post-MVP
- Active state highlighting on Header nav links — included (simple `usePathname`)
- Admin layout — separate feature, not part of this spec
