# Profile: Progress "Coming Soon" Design

## Scope

Mark the Progress feature as unavailable until properly implemented.

## Changes

### 1. ProfileAside nav order + disabled Progress

- Order: Overview → Favourite Moves → Progress
- Progress rendered as `<span>` (not `<Link>`): `opacity-50`, `cursor-not-allowed`, `title="Coming soon"`
- No route navigation possible from aside

### 2. Progress route → redirect

- `src/app/(main)/profile/progress/page.tsx` calls `redirect('/profile')`
- Route is inaccessible; direct URL visits bounce to Overview

### 3. ProfileStats grid — blur overlay

- Wrap entire `<section>` grid in a `relative` container
- Grid gets `blur-sm pointer-events-none select-none`
- Absolute overlay centered: "Coming soon" label (uppercase, tracked, muted color)
- Grid stays visible underneath — creates intrigue, easy to remove when feature ships
