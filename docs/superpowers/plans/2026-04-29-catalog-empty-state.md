# Catalog Empty State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an empty state inside `MoveGrid` when filtered results are empty. No button — the aside panel already has "Clear filters".

**Architecture:** Add an early-return branch inside `MoveGrid` when `moves.length === 0`. Outer div uses `flex flex-col h-full` so the message is vertically centered in the remaining space below the header.

**Tech Stack:** React, Vitest + Testing Library

---

### Task 1: Add empty state to MoveGrid

**Files:**

- Modify: `src/features/catalog/components/MoveGrid.tsx`
- Modify: `src/features/catalog/components/MoveGrid.test.tsx`

- [x] **Step 1: Write the failing tests**

Add at the end of the `describe('MoveGrid', ...)` block in `MoveGrid.test.tsx`:

```typescript
it('shows empty state text when initialMoves is empty', () => {
  render(
    <MoveGrid initialMoves={[]} initialHasMore={false} totalCount={0} filters={{}} />,
  );
  expect(screen.getByText('No moves match these filters.')).toBeInTheDocument();
});

it('does not render move cards when initialMoves is empty', () => {
  render(
    <MoveGrid initialMoves={[]} initialHasMore={false} totalCount={0} filters={{}} />,
  );
  expect(screen.queryAllByTestId('move-card')).toHaveLength(0);
});
```

- [x] **Step 2: Implement the empty state in `MoveGrid.tsx`**

Extract the header JSX into a variable, then add an early-return branch:

```tsx
const header = (
  <div className="mb-8">
    <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-on-surface-variant uppercase">
      Catalog · {totalCount} moves
    </p>
    <h1 className="font-display text-4xl font-bold tracking-tight text-on-surface lowercase md:text-5xl">
      Every move, <em className="font-medium text-primary not-italic">indexed.</em>
    </h1>
  </div>
);

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

The normal return keeps the existing grid markup unchanged.

- [x] **Step 3: Run all tests**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -10
```

Expected: 357 tests pass.

- [x] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output.

- [x] **Step 5: Commit**

```bash
git add src/features/catalog/components/MoveGrid.tsx \
        src/features/catalog/components/MoveGrid.test.tsx \
        docs/superpowers/specs/2026-04-29-catalog-empty-state-design.md \
        docs/superpowers/plans/2026-04-29-catalog-empty-state.md
git commit -m "feat(catalog): add empty state when no moves match filters"
```
