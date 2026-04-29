# Catalog Filter Logic Redesign

**Date:** 2026-04-29  
**Status:** Approved

## Problem

Current filter logic uses OR semantics for both pole type and tags:

- **Pole type**: `poleType: { in: ['STATIC', 'SPIN'] }` — shows any move matching either type
- **Tags**: `tags: { some: { name: { in: tags } } }` — shows any move with at least one of the selected tags

This doesn't match the desired UX behavior.

## Requirements

### Pole State filter

| Selection        | Expected result                     |
| ---------------- | ----------------------------------- |
| STATIC           | Moves tagged exclusively as STATIC  |
| SPIN             | Moves tagged exclusively as SPIN    |
| STATIC + SPIN    | Moves that work on both (universal) |
| Nothing selected | All moves                           |

Key: selecting STATIC+SPIN is **more restrictive**, not less — it targets a specific "universal" category of moves, not a union.

### Tags filter

AND-logic: selecting `beginner-friendly` + `core` shows moves that contain **both** tags. The move may have additional tags (`beginner-friendly + core + aerial` is valid), but must not be missing any of the selected ones.

## Schema Change

```prisma
// Before
poleType    PoleType?   // single nullable value

// After
poleTypes   PoleType[]  // array, empty = no type assigned
```

### Migration strategy

```sql
ALTER TABLE "Move" ADD COLUMN "poleTypes" "PoleType"[] NOT NULL DEFAULT '{}';
UPDATE "Move" SET "poleTypes" = ARRAY["poleType"::"PoleType"] WHERE "poleType" IS NOT NULL;
ALTER TABLE "Move" DROP COLUMN "poleType";
```

Existing moves are backfilled: STATIC → `['STATIC']`, SPIN → `['SPIN']`, null → `[]`. Universal moves (`['STATIC', 'SPIN']`) must be set explicitly via seed.

## Filter Logic

Both `poleTypes` and `tags` produce AND-conditions. To avoid a key conflict when spreading into a single `where` object, all AND-conditions are collected into one array and written as a single `AND` clause.

### Helper functions

```ts
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
```

### Assembly in `getMovesAction`

```ts
const andConditions = [
  ...buildPoleTypeConditions(filters.poleTypes ?? []),
  ...buildTagConditions(filters.tags ?? []),
];

const where = {
  ...(filters.difficulty?.length && { difficulty: { in: filters.difficulty } }),
  ...(filters.search && { title: { contains: filters.search, mode: 'insensitive' as const } }),
  ...(andConditions.length && { AND: andConditions }),
};
```

### Pole type examples

- `poleTypes: ['STATIC']` → `[{ poleTypes: { hasEvery: ['STATIC'] } }, { NOT: { poleTypes: { has: 'SPIN' } } }]`
- `poleTypes: ['SPIN']` → `[{ poleTypes: { hasEvery: ['SPIN'] } }, { NOT: { poleTypes: { has: 'STATIC' } } }]`
- `poleTypes: ['STATIC', 'SPIN']` → `[{ poleTypes: { hasEvery: ['STATIC', 'SPIN'] } }]`

### Tag example

`tags: ['beginner-friendly', 'core']` → `[{ tags: { some: { name: 'beginner-friendly' } } }, { tags: { some: { name: 'core' } } }]`

## Affected Files

| File                                                      | Change                                                                                         |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                    | `poleType PoleType?` → `poleTypes PoleType[]`                                                  |
| `prisma/migrations/...`                                   | backfill migration                                                                             |
| `prisma/seed-move-detail.ts`                              | `poleType: 'STATIC'` → `poleTypes: ['STATIC']`                                                 |
| `prisma/seed-progress.ts`                                 | `data: { poleType }` → `data: { poleTypes: [poleType] }`                                       |
| `src/shared/types/index.ts`                               | `MoveFilters.poleType` → `poleTypes`                                                           |
| `src/features/catalog/actions.ts`                         | new pole type + tag filter logic                                                               |
| `src/features/catalog/actions.test.ts`                    | update assertions to new semantics                                                             |
| `src/features/catalog/components/CatalogFilters.tsx`      | `filters.poleType` → `filters.poleTypes`                                                       |
| `src/features/catalog/components/CatalogFilters.test.tsx` | update test props                                                                              |
| `src/features/catalog/components/MoveGrid.test.tsx`       | update mock data shape                                                                         |
| `src/features/catalog/components/MoveCard.test.tsx`       | update mock data shape                                                                         |
| `src/app/(main)/catalog/page.tsx`                         | `filters.poleType` → `filters.poleTypes`                                                       |
| `src/app/(main)/moves/[id]/page.tsx`                      | `move.poleType` → `move.poleTypes`                                                             |
| `src/features/moves/components/MoveSpecs.tsx`             | prop `poleType: PoleType \| null` → `poleTypes: PoleType[]`; display "Static & Spin" when both |
| `src/features/moves/components/MoveSpecs.test.tsx`        | update prop usage                                                                              |

## Display in MoveSpecs

| `poleTypes` value    | Displayed label |
| -------------------- | --------------- |
| `[]`                 | — (nothing)     |
| `['STATIC']`         | Static          |
| `['SPIN']`           | Spin            |
| `['STATIC', 'SPIN']` | Static & Spin   |

## URL Params

The URL query parameter key stays `poleType` (e.g., `?poleType=STATIC,SPIN`) — this is a UI concern independent of the DB field name.

## Test Strategy

- Update existing unit tests in `actions.test.ts` to assert new `poleTypes`-based `where` clauses
- New test cases for AND tag logic: single tag, two tags (both present), two tags (one missing)
- New test cases for pole type: STATIC-only, SPIN-only, STATIC+SPIN (universal), empty
- `MoveSpecs.test.tsx`: add case for `poleTypes: ['STATIC', 'SPIN']` → "Static & Spin"
