# Catalog Filter Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace OR filter logic for pole types and tags with exact-category AND logic, and change the `poleType` schema field from a single nullable enum to an array.

**Architecture:** Schema migration changes `poleType PoleType?` → `poleTypes PoleType[]` with backfill. Filter logic is rebuilt around two pure helper functions (`buildPoleTypeConditions`, `buildTagConditions`) that return condition arrays merged into a single Prisma `AND` clause. All TypeScript consumers of `Move.poleType` are updated to `Move.poleTypes`.

**Tech Stack:** Prisma 7, PostgreSQL, Next.js 15, Vitest, TypeScript

**Worktree:** `.worktrees/feat/catalog-filter-logic`

---

### Task 1: Update Prisma schema and run migration

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update schema field**

In `prisma/schema.prisma`, find the `Move` model and replace:

```prisma
  poleType    PoleType?
```

with:

```prisma
  poleTypes   PoleType[]
```

- [ ] **Step 2: Run migration**

```bash
cd .worktrees/feat/catalog-filter-logic
npx prisma migrate dev --name rename_poleType_to_poleTypes
```

Expected: Prisma prompts to create migration, generates SQL that adds the new array column, backfills from the old column, and drops the old column. Migration file created under `prisma/migrations/`. Prisma client regenerated.

> If the auto-generated migration SQL doesn't include the backfill UPDATE, edit the migration file before applying it to add:
>
> ```sql
> UPDATE "Move" SET "poleTypes" = ARRAY["poleType"::"PoleType"] WHERE "poleType" IS NOT NULL;
> ```
>
> between the ADD COLUMN and DROP COLUMN statements.

- [ ] **Step 3: Verify Prisma client updated**

```bash
grep -n "poleTypes" node_modules/.prisma/client/index.d.ts | head -5
```

Expected: lines showing `poleTypes: PoleType[]` in the `Move` type.

---

### Task 2: Update `MoveFilters` type

**Files:**

- Modify: `src/shared/types/index.ts`

- [ ] **Step 1: Rename the field**

In `src/shared/types/index.ts`, change:

```ts
export interface MoveFilters {
  poleType?: PoleType[];
  difficulty?: Difficulty[];
  search?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}
```

to:

```ts
export interface MoveFilters {
  poleTypes?: PoleType[];
  difficulty?: Difficulty[];
  search?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/shared/types/index.ts
git commit -m "feat: migrate poleType to poleTypes array + update MoveFilters type"
```

---

### Task 3: Rewrite `getMovesAction` with TDD

**Files:**

- Modify: `src/features/catalog/actions.ts`
- Modify: `src/features/catalog/actions.test.ts`

- [ ] **Step 1: Replace `actions.test.ts` with new test suite**

Replace the entire content of `src/features/catalog/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    move: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    tag: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/shared/lib/prisma';

import { getMovesAction, getTagsAction } from './actions';

const mockTransaction = prisma.$transaction as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.move.findMany as ReturnType<typeof vi.fn>;
const mockCount = prisma.move.count as ReturnType<typeof vi.fn>;
const mockTagFindMany = prisma.tag.findMany as ReturnType<typeof vi.fn>;

const mockMoves = [
  { id: 'm1', title: 'Jade', difficulty: 'BEGINNER', poleTypes: ['STATIC'], tags: [] },
  { id: 'm2', title: 'Iguana', difficulty: 'INTERMEDIATE', poleTypes: ['SPIN'], tags: [] },
];

beforeEach(() => vi.clearAllMocks());

describe('getMovesAction', () => {
  it('returns PaginatedResult shape with defaults page=1 pageSize=12', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    const result = await getMovesAction();
    expect(result).toEqual({ items: mockMoves, total: 2, page: 1, pageSize: 12 });
  });

  it('applies skip=(page-1)*pageSize and take=pageSize for page 2', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 24]);
    await getMovesAction({ page: 2, pageSize: 12 });
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 12, take: 12 }));
  });

  it('does not add AND when poleTypes is empty', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ poleTypes: [] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ AND: expect.anything() }),
      }),
    );
  });

  it('filters STATIC-only: hasEvery STATIC + NOT has SPIN', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1]);
    await getMovesAction({ poleTypes: ['STATIC'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { poleTypes: { hasEvery: ['STATIC'] } },
            { NOT: { poleTypes: { has: 'SPIN' } } },
          ]),
        }),
      }),
    );
  });

  it('filters SPIN-only: hasEvery SPIN + NOT has STATIC', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[1]], 1]);
    await getMovesAction({ poleTypes: ['SPIN'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { poleTypes: { hasEvery: ['SPIN'] } },
            { NOT: { poleTypes: { has: 'STATIC' } } },
          ]),
        }),
      }),
    );
  });

  it('filters STATIC+SPIN (universal): hasEvery both, no exclusions', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ poleTypes: ['STATIC', 'SPIN'] });
    const call = mockFindMany.mock.calls[0][0] as { where: { AND: object[] } };
    expect(call.where.AND).toContainEqual({ poleTypes: { hasEvery: ['STATIC', 'SPIN'] } });
    expect(call.where.AND).not.toContainEqual(expect.objectContaining({ NOT: expect.anything() }));
  });

  it('filters by difficulty with { in: [...] }', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1]);
    await getMovesAction({ difficulty: ['BEGINNER'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ difficulty: { in: ['BEGINNER'] } }),
      }),
    );
  });

  it('filters by multiple difficulties (OR logic)', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ difficulty: ['BEGINNER', 'INTERMEDIATE'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ difficulty: { in: ['BEGINNER', 'INTERMEDIATE'] } }),
      }),
    );
  });

  it('does not add difficulty to where when array is empty', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ difficulty: [] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ difficulty: expect.anything() }),
      }),
    );
  });

  it('filters tags with AND: each tag must be present', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1]);
    await getMovesAction({ tags: ['aerial', 'flexibility'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { tags: { some: { name: 'aerial' } } },
            { tags: { some: { name: 'flexibility' } } },
          ]),
        }),
      }),
    );
  });

  it('single tag produces single AND condition', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1]);
    await getMovesAction({ tags: ['aerial'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ tags: { some: { name: 'aerial' } } }]),
        }),
      }),
    );
  });

  it('does not add AND when tags is empty', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ tags: [] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ AND: expect.anything() }),
      }),
    );
  });

  it('merges poleTypes and tags into a single AND array', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1]);
    await getMovesAction({ poleTypes: ['STATIC'], tags: ['aerial'] });
    const call = mockFindMany.mock.calls[0][0] as { where: { AND: object[] } };
    expect(call.where.AND).toContainEqual({ poleTypes: { hasEvery: ['STATIC'] } });
    expect(call.where.AND).toContainEqual({ tags: { some: { name: 'aerial' } } });
  });

  it('filters by search with case-insensitive title match', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ search: 'jade' });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          title: { contains: 'jade', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('total reflects filtered count not all moves', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1]);
    const result = await getMovesAction({ poleTypes: ['STATIC'] });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it('count uses same where clause as findMany', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ poleTypes: ['STATIC'], difficulty: ['BEGINNER'] });
    const findManyWhere = (mockFindMany.mock.calls[0][0] as { where: object }).where;
    const countWhere = (mockCount.mock.calls[0][0] as { where: object }).where;
    expect(findManyWhere).toEqual(countWhere);
  });
});

describe('getTagsAction', () => {
  it('returns tags ordered by name', async () => {
    const mockTags = [
      { id: 'tag-1', name: 'aerial', color: '#3b82f6' },
      { id: 'tag-2', name: 'flexibility', color: '#a855f7' },
    ];
    mockTagFindMany.mockResolvedValue(mockTags);
    const result = await getTagsAction();
    expect(result).toEqual(mockTags);
    expect(mockTagFindMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });

  it('returns empty array when no tags exist', async () => {
    mockTagFindMany.mockResolvedValue([]);
    const result = await getTagsAction();
    expect(result).toEqual([]);
  });

  it('includes color field in returned shape', async () => {
    mockTagFindMany.mockResolvedValue([{ id: 'tag-1', name: 'aerial', color: '#3b82f6' }]);
    const [tag] = await getTagsAction();
    expect(tag).toHaveProperty('color');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/features/catalog/actions.test.ts
```

Expected: multiple failures on poleType/poleTypes-related tests (old implementation still in place).

- [ ] **Step 3: Replace `actions.ts` with new implementation**

Replace the entire content of `src/features/catalog/actions.ts`:

```ts
'use server';
import { prisma } from '@/shared/lib/prisma';
import type { MoveFilters, PaginatedResult, PoleType } from '@/shared/types';

import type { MoveWithTags } from './types';

const ALL_POLE_TYPES = ['STATIC', 'SPIN'] as const;

function buildPoleTypeConditions(selected: PoleType[]): object[] {
  if (!selected.length) return [];
  const excluded = ALL_POLE_TYPES.filter((t) => !selected.includes(t));
  return [
    { poleTypes: { hasEvery: selected } },
    ...excluded.map((t) => ({ NOT: { poleTypes: { has: t } } })),
  ];
}

function buildTagConditions(tags: string[]): object[] {
  return tags.map((tag) => ({ tags: { some: { name: tag } } }));
}

export async function getMovesAction(
  filters: MoveFilters = {},
): Promise<PaginatedResult<MoveWithTags>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;

  const andConditions = [
    ...buildPoleTypeConditions(filters.poleTypes ?? []),
    ...buildTagConditions(filters.tags ?? []),
  ];

  const where = {
    ...(filters.difficulty?.length && { difficulty: { in: filters.difficulty } }),
    ...(filters.search && {
      title: { contains: filters.search, mode: 'insensitive' as const },
    }),
    ...(andConditions.length && { AND: andConditions }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.move.findMany({
      where,
      include: { tags: true },
      orderBy: { title: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.move.count({ where }),
  ]);

  return { items: items as MoveWithTags[], total, page, pageSize };
}

export async function getTagsAction(): Promise<
  { id: string; name: string; color: string | null }[]
> {
  return prisma.tag.findMany({ orderBy: { name: 'asc' } });
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/features/catalog/actions.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog/actions.ts src/features/catalog/actions.test.ts
git commit -m "feat: rewrite getMovesAction with AND filter logic for poleTypes and tags"
```

---

### Task 4: Update mock data in MoveGrid and MoveCard tests

**Files:**

- Modify: `src/features/catalog/components/MoveGrid.test.tsx`
- Modify: `src/features/catalog/components/MoveCard.test.tsx`

- [ ] **Step 1: Fix `MoveGrid.test.tsx`**

In `src/features/catalog/components/MoveGrid.test.tsx`, find the `makeMoves` factory function. Change:

```ts
    poleType: null,
```

to:

```ts
    poleTypes: [],
```

Also find the inline mock object (around line 234):

```ts
            poleType: null,
```

and change to:

```ts
            poleTypes: [],
```

- [ ] **Step 2: Fix `MoveCard.test.tsx`**

In `src/features/catalog/components/MoveCard.test.tsx`, find the mock move object. Change:

```ts
  poleType: null,
```

to:

```ts
  poleTypes: [],
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/features/catalog/components/MoveGrid.test.tsx src/features/catalog/components/MoveCard.test.tsx
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/catalog/components/MoveGrid.test.tsx src/features/catalog/components/MoveCard.test.tsx
git commit -m "fix: update poleType → poleTypes in MoveGrid and MoveCard test mocks"
```

---

### Task 5: Update `MoveSpecs` component with TDD

**Files:**

- Modify: `src/features/moves/components/MoveSpecs.tsx`
- Modify: `src/features/moves/components/MoveSpecs.test.tsx`

- [ ] **Step 1: Replace `MoveSpecs.test.tsx`**

Replace the entire content of `src/features/moves/components/MoveSpecs.test.tsx`:

```ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MoveSpecs from './MoveSpecs';

describe('MoveSpecs', () => {
  it('renders nothing when all fields are null and poleTypes is empty', () => {
    const { container } = render(
      <MoveSpecs gripType={null} entry={null} duration={null} poleTypes={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders only non-null fields', () => {
    render(<MoveSpecs gripType="Twisted" entry={null} duration="Short" poleTypes={[]} />);
    expect(screen.getByText('Twisted')).toBeInTheDocument();
    expect(screen.getByText('Short')).toBeInTheDocument();
    expect(screen.queryByText('Entry')).not.toBeInTheDocument();
    expect(screen.queryByText('Pole Setting')).not.toBeInTheDocument();
  });

  it('renders SPIN as "Spin"', () => {
    render(<MoveSpecs gripType={null} entry={null} duration={null} poleTypes={['SPIN']} />);
    expect(screen.getByText('Spin')).toBeInTheDocument();
    expect(screen.getByText('Pole Setting')).toBeInTheDocument();
  });

  it('renders STATIC as "Static"', () => {
    render(<MoveSpecs gripType={null} entry={null} duration={null} poleTypes={['STATIC']} />);
    expect(screen.getByText('Static')).toBeInTheDocument();
    expect(screen.getByText('Pole Setting')).toBeInTheDocument();
  });

  it('renders STATIC+SPIN as "Static & Spin"', () => {
    render(
      <MoveSpecs gripType={null} entry={null} duration={null} poleTypes={['STATIC', 'SPIN']} />,
    );
    expect(screen.getByText('Static & Spin')).toBeInTheDocument();
    expect(screen.getByText('Pole Setting')).toBeInTheDocument();
  });

  it('renders all four cards when all fields are provided', () => {
    render(
      <MoveSpecs gripType="Twisted" entry="Standing" duration="Short" poleTypes={['SPIN']} />,
    );
    expect(screen.getByText('Grip Type')).toBeInTheDocument();
    expect(screen.getByText('Entry')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Pole Setting')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/features/moves/components/MoveSpecs.test.tsx
```

Expected: failures because `MoveSpecs` still expects `poleType` prop.

- [ ] **Step 3: Replace `MoveSpecs.tsx`**

Replace the entire content of `src/features/moves/components/MoveSpecs.tsx`:

```ts
import type { Move, PoleType } from '@prisma/client';

type MoveSpecsProps = Pick<Move, 'gripType' | 'entry' | 'duration' | 'poleTypes'>;
type SpecItem = { label: string; value: string };

function poleTypesLabel(types: PoleType[]): string | null {
  if (!types.length) return null;
  if (types.length >= 2) return 'Static & Spin';
  return types[0].charAt(0) + types[0].slice(1).toLowerCase();
}

function SpecCard({ label, value }: SpecItem) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-outline-variant/15 bg-surface-lowest p-6">
      <dt className="font-sans text-[10px] tracking-widest text-on-surface-variant uppercase">
        {label}
      </dt>
      <dd className="font-display text-lg text-on-surface">{value}</dd>
    </div>
  );
}

export default function MoveSpecs({ gripType, entry, duration, poleTypes }: MoveSpecsProps) {
  const raw: { label: string; value: string | null | undefined }[] = [
    { label: 'Grip Type', value: gripType },
    { label: 'Entry', value: entry },
    { label: 'Duration', value: duration },
    { label: 'Pole Setting', value: poleTypesLabel(poleTypes) },
  ];
  const specs: SpecItem[] = raw.filter((s): s is SpecItem => s.value != null);

  if (specs.length === 0) return null;

  return (
    <section aria-label="Move specs">
      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {specs.map(({ label, value }) => (
          <SpecCard key={label} label={label} value={value} />
        ))}
      </dl>
    </section>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/features/moves/components/MoveSpecs.test.tsx
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/moves/components/MoveSpecs.tsx src/features/moves/components/MoveSpecs.test.tsx
git commit -m "feat: update MoveSpecs to accept poleTypes array, display 'Static & Spin'"
```

---

### Task 6: Update `CatalogFilters` component and its tests

**Files:**

- Modify: `src/features/catalog/components/CatalogFilters.tsx`
- Modify: `src/features/catalog/components/CatalogFilters.test.tsx`

- [ ] **Step 1: Update `CatalogFilters.tsx`**

In `src/features/catalog/components/CatalogFilters.tsx`, make these four changes:

**Change 1** — `buildQuery` signature (URL key stays `poleType`, just a rename of the local parameter):

```ts
// Before
function buildQuery(
  poleType: PoleType[],

// After (no change needed — this is just a local param name, URL key is unchanged)
```

No change needed here — `poleType` in `buildQuery` is a local variable, and the URL key `poleType=...` stays the same.

**Change 2** — Read from `filters.poleTypes`:

```ts
// Before
const selectedPoleTypes = filters.poleType ?? [];

// After
const selectedPoleTypes = filters.poleTypes ?? [];
```

**Change 3** — Override type in `navigate`:

```ts
// Before
    poleType?: PoleType[];

// After
    poleTypes?: PoleType[];
```

**Change 4** — Read from overrides:

```ts
// Before
const nextPoleType = 'poleType' in overrides ? overrides.poleType! : selectedPoleTypes;

// After
const nextPoleType = 'poleTypes' in overrides ? overrides.poleTypes! : selectedPoleTypes;
```

**Change 5** — Pass to navigate:

```ts
// Before (in togglePoleType)
navigate({ poleType: next });

// After
navigate({ poleTypes: next });
```

**Change 6** — Clear filters button:

```ts
// Before
          onClick={() => navigate({ poleType: [], difficulty: [], tags: [], resetSearch: true })}

// After
          onClick={() => navigate({ poleTypes: [], difficulty: [], tags: [], resetSearch: true })}
```

- [ ] **Step 2: Update `CatalogFilters.test.tsx`**

In `src/features/catalog/components/CatalogFilters.test.tsx`, replace all occurrences of `poleType:` prop on `<CatalogFilters` with `poleTypes:`. There are multiple places — use a global replace.

Specifically, every `filters={{ poleType:` becomes `filters={{ poleTypes:`.

For example:

```tsx
// Before
render(<CatalogFilters filters={{ poleType: ['STATIC'] }} availableTags={[]} />);

// After
render(<CatalogFilters filters={{ poleTypes: ['STATIC'] }} availableTags={[]} />);
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/features/catalog/components/CatalogFilters.test.tsx
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/catalog/components/CatalogFilters.tsx src/features/catalog/components/CatalogFilters.test.tsx
git commit -m "fix: rename poleType → poleTypes in CatalogFilters"
```

---

### Task 7: Update `catalog/page.tsx`

**Files:**

- Modify: `src/app/(main)/catalog/page.tsx`

- [ ] **Step 1: Update filters object**

In `src/app/(main)/catalog/page.tsx`, change the `filters` object:

```ts
// Before
  const filters: MoveFilters = {
    poleType: parseEnumArray<PoleType>(params.poleType, validPoleTypes),

// After
  const filters: MoveFilters = {
    poleTypes: parseEnumArray<PoleType>(params.poleType, validPoleTypes),
```

Note: `params.poleType` stays — that's reading from the URL query string, not the DB field.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "catalog/page"
```

Expected: no errors for this file.

- [ ] **Step 3: Commit**

```bash
git add src/app/(main)/catalog/page.tsx
git commit -m "fix: rename poleType → poleTypes in catalog page filters"
```

---

### Task 8: Update `moves/[id]/page.tsx`

**Files:**

- Modify: `src/app/(main)/moves/[id]/page.tsx`

- [ ] **Step 1: Update the page**

Replace the `poleTypeLabel` derivation and `MoveSpecs` usage. In `src/app/(main)/moves/[id]/page.tsx`:

**Change 1** — Remove old `poleTypeLabel` and add new helper:

```ts
// Before
const poleTypeLabel = move.poleType
  ? move.poleType.charAt(0) + move.poleType.slice(1).toLowerCase()
  : null;

// After
function getPoleTypesLabel(types: string[]): string | null {
  if (!types.length) return null;
  if (types.length >= 2) return 'Static & Spin';
  return types[0].charAt(0) + types[0].slice(1).toLowerCase();
}
const poleTypeLabel = getPoleTypesLabel(move.poleTypes);
```

**Change 2** — Update `MoveSpecs` prop:

```tsx
// Before
        <MoveSpecs
          gripType={move.gripType}
          entry={move.entry}
          duration={move.duration}
          poleType={move.poleType}
        />

// After
        <MoveSpecs
          gripType={move.gripType}
          entry={move.entry}
          duration={move.duration}
          poleTypes={move.poleTypes}
        />
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(main)/moves/[id]/page.tsx
git commit -m "fix: update moves detail page to use poleTypes array"
```

---

### Task 9: Update seed files

**Files:**

- Modify: `prisma/seed-move-detail.ts`
- Modify: `prisma/seed-progress.ts`

- [ ] **Step 1: Update `seed-move-detail.ts`**

In `prisma/seed-move-detail.ts`, change the type in the `updates` array and all `poleType` values:

**Change the type declaration:**

```ts
// Before
const updates: {
  title: string;
  gripType: string;
  entry: string;
  duration: string;
  poleType: 'STATIC' | 'SPIN';
  stepsData: StepItem[];
}[] = [

// After
const updates: {
  title: string;
  gripType: string;
  entry: string;
  duration: string;
  poleTypes: ('STATIC' | 'SPIN')[];
  stepsData: StepItem[];
}[] = [
```

**Change each move entry** — replace `poleType: 'SPIN'` with `poleTypes: ['SPIN']` and `poleType: 'STATIC'` with `poleTypes: ['STATIC']`. There are 6 entries in total (Fireman Spin, Chair Spin, Carousel Spin → `['SPIN']`; Inside Leg Hang, Superman, Basic Climb → `['STATIC']`).

- [ ] **Step 2: Update `seed-progress.ts`**

In `prisma/seed-progress.ts`, make these changes:

**Change the POLE_TYPE constant:**

```ts
// Before
const POLE_TYPE: Record<string, 'STATIC' | 'SPIN'> = {
  'Fireman Spin': 'SPIN',
  'Chair Spin': 'SPIN',
  'Back Hook Spin': 'SPIN',
  'Attitude Spin': 'SPIN',
  'Carousel Spin': 'SPIN',
  'Floor Spin': 'SPIN',
  'Basic Climb': 'STATIC',
  'Pole Sit': 'STATIC',
  'Inside Leg Hang': 'STATIC',
  'Cross Knee Release': 'STATIC',
  Superman: 'STATIC',
  'Iguana Mount': 'STATIC',
  Flag: 'STATIC',
  Handspring: 'STATIC',
  'Butterfly to Jade': 'STATIC',
  'Ayesha to Superman': 'STATIC',
  'Body Roll': 'STATIC',
  'Pole Crawl': 'STATIC',
};

// After
const POLE_TYPES: Record<string, ('STATIC' | 'SPIN')[]> = {
  'Fireman Spin': ['SPIN'],
  'Chair Spin': ['SPIN'],
  'Back Hook Spin': ['SPIN'],
  'Attitude Spin': ['SPIN'],
  'Carousel Spin': ['SPIN'],
  'Floor Spin': ['SPIN'],
  'Basic Climb': ['STATIC'],
  'Pole Sit': ['STATIC'],
  'Inside Leg Hang': ['STATIC'],
  'Cross Knee Release': ['STATIC'],
  Superman: ['STATIC'],
  'Iguana Mount': ['STATIC'],
  Flag: ['STATIC'],
  Handspring: ['STATIC'],
  'Butterfly to Jade': ['STATIC'],
  'Ayesha to Superman': ['STATIC'],
  'Body Roll': ['STATIC'],
  'Pole Crawl': ['STATIC'],
};
```

**Change the loop:**

```ts
// Before
let poleTypeCount = 0;
for (const [title, poleType] of Object.entries(POLE_TYPE)) {
  const moveId = moveByTitle[title];
  if (!moveId) {
    console.warn(`Move not found: ${title}`);
    continue;
  }
  await prisma.move.update({ where: { id: moveId }, data: { poleType } });
  poleTypeCount++;
}
console.log(`Updated poleType for ${poleTypeCount} moves.`);

// After
let poleTypeCount = 0;
for (const [title, poleTypes] of Object.entries(POLE_TYPES)) {
  const moveId = moveByTitle[title];
  if (!moveId) {
    console.warn(`Move not found: ${title}`);
    continue;
  }
  await prisma.move.update({ where: { id: moveId }, data: { poleTypes } });
  poleTypeCount++;
}
console.log(`Updated poleTypes for ${poleTypeCount} moves.`);
```

- [ ] **Step 3: Verify TypeScript in seed files**

```bash
npx tsc --noEmit --project tsconfig.json 2>&1 | grep "seed"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed-move-detail.ts prisma/seed-progress.ts
git commit -m "fix: update seed files to use poleTypes array"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (previously 349; may be slightly more due to new test cases).

- [ ] **Step 2: TypeScript full check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Final commit if any stray changes remain**

```bash
git status
```

If clean, done. If stray changes exist, add and commit them.

---

## File Summary

| File                                                      | Task |
| --------------------------------------------------------- | ---- |
| `prisma/schema.prisma`                                    | 1    |
| `prisma/migrations/*/migration.sql`                       | 1    |
| `src/shared/types/index.ts`                               | 2    |
| `src/features/catalog/actions.ts`                         | 3    |
| `src/features/catalog/actions.test.ts`                    | 3    |
| `src/features/catalog/components/MoveGrid.test.tsx`       | 4    |
| `src/features/catalog/components/MoveCard.test.tsx`       | 4    |
| `src/features/moves/components/MoveSpecs.tsx`             | 5    |
| `src/features/moves/components/MoveSpecs.test.tsx`        | 5    |
| `src/features/catalog/components/CatalogFilters.tsx`      | 6    |
| `src/features/catalog/components/CatalogFilters.test.tsx` | 6    |
| `src/app/(main)/catalog/page.tsx`                         | 7    |
| `src/app/(main)/moves/[id]/page.tsx`                      | 8    |
| `prisma/seed-move-detail.ts`                              | 9    |
| `prisma/seed-progress.ts`                                 | 9    |
