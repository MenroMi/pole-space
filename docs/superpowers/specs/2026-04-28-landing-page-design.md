# Landing Page — Design Spec

_2026-04-28_

## Overview

A minimal, isolated landing page for unauthenticated visitors. Single screen, no scroll, no Header/Footer components from `(main)` layout. Authenticated users are redirected server-side to `/catalog` before any HTML is rendered.

## Architecture

**Files touched:**

- `src/app/page.tsx` — replace stub with full RSC landing page
- `src/app/landing.module.css` — CSS module with keyframes for drift animation and pole hairline (cannot be expressed in Tailwind)

**Routing:** `page.tsx` lives outside the `(main)` route group, so `(main)/layout.tsx` (Header + Footer) is not applied.

**No new dependencies.**

## Auth Logic

```ts
const session = await auth();
if (session) redirect('/catalog');
```

- Uses existing `auth()` from the project's auth module
- Server-side redirect — no flash, no client JS
- Page renders only for unauthenticated visitors

## Visual Layout

`min-h-screen` CSS grid: `grid-template-rows: auto 1fr auto`  
Padding: `32px clamp(24px, 6vw, 64px)`  
Background: `#0d0e0f` (design spec; slightly darker than `--surface`)

### Background elements (CSS pseudo-elements on `.page`)

- `::before` — violet radial spotlight, 600×600px, `rgba(220,184,255,0.08)`, 40px blur, `drift` keyframe (18s ease-in-out infinite alternate, translates ±5% X, ±2% Y)
- `::after` — vertical pole shaft, `left: 50%`, 1px wide, gradient from transparent → `rgba(151,142,155,0.18)` at 25–75% → transparent, `z-index: 1`

### Top bar (`.topbar`)

- Left: wordmark `pole space.` — Space Grotesk, 18px, weight 600, `letter-spacing: -0.02em`, violet `.` (`#dcb8ff`)
- Right: `— catalog · 2026` — monospace, 11px, `letter-spacing: 0.08em`, `#978e9b`
- Mobile (`max-width: 640px`): right text hidden

### Center block (`.center`)

`max-width: 560px`, `padding: 80px 0`, flex column, justify-content center

| Element       | Details                                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eyebrow       | `A small catalog` — 10px, weight 600, `letter-spacing: 0.18em`, uppercase, `#dcb8ff`, left line via `::before` (24px, 1px, currentColor)                                                                            |
| H1            | `A quiet place to keep the moves you're working on.` — Space Grotesk, `clamp(40px, 5.5vw, 64px)`, weight 500, `letter-spacing: -0.03em`, line-height 1.05; `working on` wrapped in `<em>` (italic, weight 400)      |
| Lede          | `A small, careful catalog of pole moves — written by performers we know, photographed in studios we visit. No feed, no streaks. Just the moves and your notes.` — 16px, line-height 1.6, `#cdc3d2`, max-width 460px |
| CTAs          | flex row, gap 32px, flex-wrap                                                                                                                                                                                       |
| Primary CTA   | `Create an account →` → `/sign-up` — transparent bg, no border, `#dcb8ff`, 12px, weight 700, `letter-spacing: 0.18em`, uppercase, border-bottom 1px `#dcb8ff`; hover: gap expands 8px→14px (180ms)                  |
| Secondary CTA | `Browse the catalog` → `/catalog` — 13px, `#cdc3d2`, border-bottom transparent; hover: border shows + color `#e2e2e2`                                                                                               |
| Hint          | `Free. No invite needed.` — monospace, 11px, `#4b4450`, margin-top 18px                                                                                                                                             |

### Footer (`.footer`)

`justify-content: space-between`, 11px, `#978e9b`

| Column | Content                                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Left   | `© 2026 pole space`                                                                                                                    |
| Center | `Made in Zagreb · by two performers` — 10px, weight 600, uppercase, `letter-spacing: 0.18em`, `#4b4450`; "two performers" in `#978e9b` |
| Right  | `contact@polespace.com` — link, hover color `#dcb8ff`                                                                                  |

Mobile: footer stacks vertically, `align-items: flex-start`

## CSS Animations

```css
@keyframes drift {
  from {
    transform: translate(-55%, -32%);
  }
  to {
    transform: translate(-45%, -28%);
  }
}
```

Defined in `src/app/landing.module.css`, imported in `page.tsx`.

## Tokens Used

All colors are hardcoded per the design file (landing uses `#0d0e0f` bg, slightly outside the standard token range). Typography uses `var(--font-display)` and `var(--font-sans)` from the root layout's font variables.

## Out of Scope

- OG/social metadata (can be added later)
- Analytics/tracking
- Password reset flow
- OAuth buttons
