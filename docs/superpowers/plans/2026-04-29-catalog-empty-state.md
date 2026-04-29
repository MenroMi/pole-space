# Catalog Empty State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an empty state inside `MoveGrid` when filtered results are empty, with a "Clear filters" button that appears only when filters are active.

**Architecture:** Add a `hasActiveFilters` helper and an early-return branch inside `MoveGrid` when `moves.length === 0`. No new components, no new props — `filters` and `router` are already available (router needs to be added via `useRouter`).

**Tech Stack:** React, Next.js (`useRouter`), Vitest + Testing Library

---

### Task 1: Add empty state to MoveGrid

**Files:**

- Modify: `src/features/catalog/components/MoveGrid.tsx`
- Modify: `src/features/catalog/components/MoveGrid.test.tsx`

- [ ] **Step 1: Add `useRouter` mock to the test file**

Open `src/features/catalog/components/MoveGrid.test.tsx` and add this mock near the top (after the existing `vi.mock` calls):

```typescript
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));
```

- [ ] **Step 2: Write the two failing tests**

Add at the end of the `describe('MoveGrid', ...)` block in `MoveGrid.test.tsx`:

```typescript
it('shows empty state text when initialMoves is empty', () => {
  render(
    <MoveGrid initialMoves={[]} initialHasMore={false} totalCount={0} filters={{}} />,
  );
  expect(screen.getByText('No moves match these filters.')).toBeInTheDocument();
});

it('shows Clear filters button when initialMoves is empty and filters are active', () => {
  render(
    <MoveGrid
      initialMoves={[]}
      initialHasMore={false}
      totalCount={0}
      filters={{ poleTypes: ['STATIC'] }}
    />,
  );
  expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
});

it('does not show Clear filters button when initialMoves is empty and no filters', () => {
  render(
    <MoveGrid initialMoves={[]} initialHasMore={false} totalCount={0} filters={{}} />,
  );
  expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd .worktrees/feat/catalog-filter-logic && npx vitest run src/features/catalog/components/MoveGrid.test.tsx --reporter=verbose 2>&1 | tail -20
```

Expected: 3 new tests FAIL.

- [ ] **Step 4: Implement the empty state in `MoveGrid.tsx`**

Replace the full content of `src/features/catalog/components/MoveGrid.tsx` with:

```typescript
'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/shared/components/ui/button';
import { getMovesAction } from '../actions';
import type { MoveWithTags, MoveFilters } from '../types';

import MoveCard from './MoveCard';

const PAGE_SIZE = 12;

type MoveGridProps = {
  initialMoves: MoveWithTags[];
  initialHasMore: boolean;
  totalCount: number;
  filters: MoveFilters;
};

function hasActiveFilters(filters: MoveFilters): boolean {
  return !!(
    filters.poleTypes?.length ||
    filters.difficulty?.length ||
    filters.tags?.length ||
    filters.search
  );
}

export default function MoveGrid({
  initialMoves,
  initialHasMore,
  totalCount,
  filters,
}: MoveGridProps) {
  const router = useRouter();
  const [moves, setMoves] = useState(initialMoves);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const pageRef = useRef(1);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    let cancelled = false;

    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || isLoadingRef.current) return;

      isLoadingRef.current = true;
      setLoading(true);

      try {
        const nextPage = pageRef.current + 1;
        const result = await getMovesAction({ ...filters, page: nextPage, pageSize: PAGE_SIZE });

        if (cancelled) return;

        pageRef.current = nextPage;
        setMoves((prev) => [...prev, ...result.items]);
        setHasMore(result.items.length >= PAGE_SIZE);
      } finally {
        if (!cancelled) {
          isLoadingRef.current = false;
          setLoading(false);
        }
      }
    });

    observer.observe(sentinel);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
    // filters is stable for this component's lifetime — parent remounts via `key` prop when filters change
  }, [hasMore]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="p-6">
        {header}
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

  return (
    <div className="p-6">
      {header}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {moves.map((move) => (
          <MoveCard key={move.id} move={move} />
        ))}
      </div>
      {loading && (
        <div className="flex justify-center py-8" data-testid="loading-spinner">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
      {hasMore && <div ref={sentinelRef} data-testid="sentinel" />}
    </div>
  );
}
```

- [ ] **Step 5: Run all tests to verify everything passes**

```bash
cd .worktrees/feat/catalog-filter-logic && npx vitest run --reporter=verbose 2>&1 | tail -15
```

Expected: all tests pass (358+).

- [ ] **Step 6: TypeScript check**

```bash
cd .worktrees/feat/catalog-filter-logic && npx tsc --noEmit 2>&1
```

Expected: no output (clean).

- [ ] **Step 7: Commit**

```bash
cd .worktrees/feat/catalog-filter-logic && git add src/features/catalog/components/MoveGrid.tsx src/features/catalog/components/MoveGrid.test.tsx && git commit -m "feat(catalog): add empty state when no moves match filters"
```
