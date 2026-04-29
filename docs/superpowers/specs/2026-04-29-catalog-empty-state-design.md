# Catalog Empty State Design

**Date:** 2026-04-29
**Branch:** feat/catalog-filter-logic (or new branch off main)

## Problem

When no moves match the active filters, the catalog shows a blank grid with no feedback to the user.

## Goal

Show a clear, on-brand empty state inside `MoveGrid` when the filtered result set is empty, with an optional "Clear filters" button.

## Design Decisions

- **Style:** Variant C — header stays in place ("Catalog · 0 moves" + "Every move, indexed."), empty state replaces only the grid area. No jarring layout shift.
- **Implementation:** Logic lives inside `MoveGrid` (approach A). No new props or server-side changes needed — `filters` is already available.
- **Button visibility:** "Clear filters" shown only when at least one filter is active. Hidden when catalog is genuinely empty with no filters applied.

## Component Changes

### `MoveGrid.tsx`

Add a `hasActiveFilters` helper:

```ts
function hasActiveFilters(filters: MoveFilters): boolean {
  return !!(
    filters.poleTypes?.length ||
    filters.difficulty?.length ||
    filters.tags?.length ||
    filters.search
  );
}
```

When `moves.length === 0`, render empty state instead of grid + sentinel:

```tsx
if (moves.length === 0) {
  return (
    <div className="p-6">
      {/* same header block */}
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-sm text-on-surface-variant">No moves match these filters.</p>
        {hasActiveFilters(filters) && (
          <Button variant="secondary" onClick={() => router.replace('/catalog')}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
```

`MoveGrid` already receives `filters` and has `router` — no new dependencies.

## UI Copy

| Situation                 | Text                            | Button                       |
| ------------------------- | ------------------------------- | ---------------------------- |
| Filters active, 0 results | "No moves match these filters." | "Clear filters" → `/catalog` |
| No filters, 0 results     | "No moves match these filters." | none                         |

## Tests

Two new cases in `MoveGrid.test.tsx`:

1. `initialMoves=[]` + active filters → renders "No moves match these filters." + "Clear filters" button
2. `initialMoves=[]` + no filters → renders "No moves match these filters.", no button

Existing tests unaffected (all pass non-empty `initialMoves`).

## Out of Scope

- Animated transitions into empty state
- Suggestions ("Try removing X filter")
- Skeleton loaders
