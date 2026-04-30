# Catalog Empty State Design

**Date:** 2026-04-29
**Branch:** feat/catalog-filter-logic

## Problem

When no moves match the active filters, the catalog shows a blank grid with no feedback to the user.

## Goal

Show a clear, on-brand empty state inside `MoveGrid` when the filtered result set is empty. No button — the aside panel already has a "Clear filters" button.

## Design Decisions

- **Style:** Variant C — header stays in place ("Catalog · 0 moves" + "Every move, indexed."), empty state fills the remaining height below the header. No jarring layout shift.
- **Implementation:** Logic lives inside `MoveGrid` (approach A). No new props or server-side changes needed.
- **No button:** The aside `CatalogFilters` already provides "Clear filters". Duplicating it in the empty state is redundant.
- **Vertical centering:** Outer div uses `flex flex-col h-full`; empty state area uses `flex-1 flex items-center justify-center` so the message sits in the center of the remaining space.

## Component Changes

### `MoveGrid.tsx`

When `moves.length === 0`, render empty state instead of grid + sentinel:

```tsx
if (moves.length === 0) {
  return (
    <div className="flex h-full flex-col p-6">
      {header}
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-on-surface-variant">No moves match these filters.</p>
      </div>
    </div>
  );
}
```

No new imports or dependencies needed.

## UI Copy

| Situation                    | Text                            |
| ---------------------------- | ------------------------------- |
| 0 results (any filter state) | "No moves match these filters." |

## Tests

Two cases in `MoveGrid.test.tsx`:

1. `initialMoves=[]` → renders "No moves match these filters."
2. `initialMoves=[]` → no move cards rendered

Existing tests unaffected (all pass non-empty `initialMoves`).

## Out of Scope

- "Clear filters" button in empty state (handled by aside)
- Animated transitions
- Suggestions ("Try removing X filter")
- Skeleton loaders
