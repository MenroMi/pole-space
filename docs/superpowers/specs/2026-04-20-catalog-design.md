# Catalog UI Design — Kinetic Gallery

## Overview

Public catalog page displaying pole dance moves with hierarchical filters (category + difficulty), full-text search, and infinite scroll. First page rendered server-side (RSC); subsequent pages fetched client-side via IntersectionObserver.

---

## 1. Architecture

**Pattern:** RSC initial load + client-side infinite scroll + URL search params for filters.

```
CatalogPage (RSC)
  reads searchParams → getMovesAction({ ...filters, page: 1, pageSize: 12 })
  └── <PageShell aside={<CatalogFilters filters={filters} />}>
        └── <MoveGrid initialMoves={moves} initialHasMore={hasMore} filters={filters} />
```

**Data flow:**

1. URL: `/catalog?category=SPINS&difficulty=BEGINNER&search=jade`
2. `CatalogPage` parses `searchParams`, calls `getMovesAction` → first 12 moves + total count
3. Renders `PageShell` with `CatalogFilters` in aside and `MoveGrid` as main content
4. `MoveGrid` renders cards + invisible sentinel `<div>` at the end of the list
5. `IntersectionObserver` watches the sentinel; when it enters viewport → fetch `page + 1`
6. Append new moves: `setMoves(prev => [...prev, ...newMoves])`
7. If returned `items.length < pageSize` → no more pages, hide loader, stop observing
8. When `filters` prop changes (URL changed) → reset to `initialMoves`, page 1

The catalog is **public** — no authentication required.

---

## 2. `getMovesAction` Extension

**File:** `src/features/catalog/actions.ts`

Extended signature:

```ts
export async function getMovesAction(
  filters: MoveFilters = {},
): Promise<PaginatedResult<MoveWithTags>>;
```

`MoveFilters` in `src/shared/types/index.ts` gains two new optional fields:

```ts
export interface MoveFilters {
  category?: Category;
  difficulty?: Difficulty;
  search?: string;
  tags?: string[]; // existing (unimplemented, unchanged)
  page?: number; // new — default 1
  pageSize?: number; // new — default 12
}
```

Implementation uses `prisma.move.findMany` with `skip: (page - 1) * pageSize` and `take: pageSize`, plus `prisma.move.count` with the same `where` clause (run in `prisma.$transaction`).

Returns `PaginatedResult<MoveWithTags>`: `{ items, total, page, pageSize }`.

---

## 3. Components

### MoveCard

**File:** `src/features/catalog/components/MoveCard.tsx`

Server Component — pure display, no interactivity.

**Props:** `move: MoveWithTags`

**Layout (top to bottom):**

- Image: `move.imageUrl` via `next/image`; fallback to YouTube thumbnail `https://img.youtube.com/vi/{videoId}/hqdefault.jpg` (videoId extracted from `move.youtubeUrl`)
- Difficulty badge: pill chip, color by level:
  - BEGINNER → `secondary-container` / `on-secondary-container`
  - INTERMEDIATE → `primary-container` / `on-primary`
  - ADVANCED → custom amber tones (inline style, not in design token set)
- Title: Space Grotesk (`font-display`), truncated to 1 line
- Description: Manrope, truncated to 2 lines (`line-clamp-2`), `text-on-surface-variant`
- Tags: horizontal flex-wrap, pill chips (`secondary-container` bg), max 3 visible (overflow hidden)

Entire card is wrapped in `<Link href={/moves/${move.id}}>` — fully clickable.

Card background: `surface-container` (#1f1f1f). On hover: `surface-container-high` (#2a2a2a) — no border, tonal lift only (No-Line rule).

### MoveGrid

**File:** `src/features/catalog/components/MoveGrid.tsx`

Client Component (`'use client'`).

**Props:**

```ts
interface MoveGridProps {
  initialMoves: MoveWithTags[];
  initialHasMore: boolean;
  filters: MoveFilters;
}
```

**State:** `moves`, `page`, `loading`, `hasMore`

**Behavior:**

- `useEffect` on `filters` change: reset `moves` to `initialMoves`, reset `page` to 1, reset `hasMore` to `initialHasMore`
- `IntersectionObserver` on sentinel div: when visible + `hasMore` + `!loading` → `loadMore()`
- `loadMore()`: calls `getMovesAction({ ...filters, page: page + 1, pageSize: 12 })`, appends items, updates `hasMore`
- Loading state: spinner below the grid while fetching

**Layout:** CSS Grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, gap between cards.

### CatalogFilters

**File:** `src/features/catalog/components/CatalogFilters.tsx`

Client Component (`'use client'`).

**Props:** `filters: MoveFilters` (current active filters, read from URL by page)

**Structure:**

- Search input at top: debounced 300ms, updates `?search=` param via `router.replace()`
- Category list — always expanded (no accordion):
  ```
  SPINS
    BEGINNER
    INTERMEDIATE
    ADVANCED
  CLIMBS
    ...
  HOLDS / COMBOS / FLOORWORK
  ```
- Click on category name → `router.replace('/catalog?category=SPINS')` — sets category, clears difficulty
- Click on sub-item → `router.replace('/catalog?category=SPINS&difficulty=BEGINNER')`
- Active category/difficulty: `text-primary` color
- "Clear filters" button (shown only when any filter is active) → `router.replace('/catalog')`

URL updates use `router.replace()` (not `push`) to avoid polluting browser history on every filter change.

### CatalogPage

**File:** `src/app/(main)/catalog/page.tsx`

RSC. Reads `searchParams`, calls `getMovesAction`, renders layout.

```ts
type Props = {
  searchParams: Promise<{
    category?: string;
    difficulty?: string;
    search?: string;
  }>;
};
```

Parses and validates enum values before passing to action (invalid values → undefined).

`initialHasMore = result.total > result.items.length`

---

## 4. Files Created / Modified

| File                                                      | Action                                                               |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/shared/types/index.ts`                               | Modify — add `page?` and `pageSize?` to `MoveFilters`                |
| `src/features/catalog/actions.ts`                         | Modify — pagination support, returns `PaginatedResult<MoveWithTags>` |
| `src/features/catalog/types.ts`                           | Modify — re-export `PaginatedResult`                                 |
| `src/features/catalog/index.ts`                           | Modify — update exports                                              |
| `src/features/catalog/components/MoveCard.tsx`            | Create                                                               |
| `src/features/catalog/components/MoveGrid.tsx`            | Create                                                               |
| `src/features/catalog/components/CatalogFilters.tsx`      | Create                                                               |
| `src/app/(main)/catalog/page.tsx`                         | Modify — replace stub with real implementation                       |
| `src/features/catalog/components/MoveCard.test.tsx`       | Create                                                               |
| `src/features/catalog/components/MoveGrid.test.tsx`       | Create                                                               |
| `src/features/catalog/components/CatalogFilters.test.tsx` | Create                                                               |
| `src/features/catalog/actions.test.ts`                    | Create                                                               |

---

## 5. Testing Strategy

### `getMovesAction` tests

- Returns `{ items, total, page, pageSize }`
- Applies `skip`/`take` correctly for page 2
- Filters by category, difficulty, search independently and combined
- `total` reflects filtered count, not all moves

### `MoveCard` tests

- Renders title, description (truncated via class), difficulty badge
- Renders tags (up to 3)
- Falls back to YouTube thumbnail when `imageUrl` is null
- Card links to `/moves/{id}`

### `MoveGrid` tests

- Renders `initialMoves`
- Resets state when `filters` prop changes
- Calls `getMovesAction` when IntersectionObserver sentinel triggers (mock `IntersectionObserver` globally)
- Appends new moves to existing list on load more
- Hides sentinel when `hasMore` is false

### `CatalogFilters` tests

- Clicking a category calls `router.replace` with `?category=SPINS`
- Clicking a sub-item calls `router.replace` with `?category=SPINS&difficulty=BEGINNER`
- Clicking category clears existing difficulty param
- "Clear filters" button visible when filters active, hidden when not
- Search input triggers `router.replace` with `?search=` after debounce

---

## 6. Out of Scope

- Tag filtering (existing tech debt, `filters.tags` field untouched)
- Move detail page (`/moves/[id]`) — separate feature
- User progress indicators on cards (WANT_TO_LEARN / IN_PROGRESS / LEARNED) — post-auth
- Sorting options — post-MVP
- Empty state design — show "No moves found" text only
