# Move Detail Redesign — Design Spec

_2026-04-28_

## Goal

Redesign the Move Detail page to match the new design system: 2-column hero grid, integrated ProgressStatusPicker, horizontal related moves cards, and updated visual style throughout. All existing functionality (YouTube playback, seek-to-timestamp, tab navigation, favourite toggle) is preserved.

## Files Touched

| File                                             | Change                                                      |
| ------------------------------------------------ | ----------------------------------------------------------- |
| `src/app/(main)/moves/[id]/page.tsx`             | Restructure layout, add currentProgress, pass to components |
| `src/features/moves/actions.ts`                  | Add UserProgress fetch to `getMoveByIdAction`               |
| `src/features/moves/types.ts`                    | Add `currentProgress: LearnStatus \| null` to `MoveDetail`  |
| `src/features/moves/components/MovePlayer.tsx`   | 2-column hero grid; info panel on right                     |
| `src/features/moves/components/MoveHero.tsx`     | `h-[65vh]` → `aspect-[16/9]` in grid column                 |
| `src/features/moves/components/MoveSpecs.tsx`    | Add "SPECS" section label                                   |
| `src/features/moves/components/MoveTabs.tsx`     | Update gradient underline colours                           |
| `src/features/moves/components/RelatedMoves.tsx` | Image-thumbnail cards with difficulty colour label          |

`MoveBreakdown.tsx`, `MoveFavouriteButton.tsx`, `MoveBreadcrumb.tsx` — no changes.

---

## Data Layer

### `getMoveByIdAction` — add UserProgress

```ts
const [move, favourites, progressRecord] = await Promise.all([
  prisma.move.findUnique({ where: { id } }),
  userId ? prisma.userFavourite.findMany({ where: { userId, moveId: id } }) : [],
  userId ? prisma.userProgress.findFirst({ where: { userId, moveId: id } }) : null,
]);
```

Return: `{ ...move, favourites, stepsData, currentProgress: progressRecord?.status ?? null }`

### `MoveDetail` type

```ts
type MoveDetail = Omit<Move, 'stepsData'> & {
  favourites: UserFavourite[];
  stepsData: StepItem[];
  currentProgress: LearnStatus | null;
};
```

---

## Page Layout (`page.tsx`)

```
<main>
  <MoveBreadcrumb />
  <MovePlayer>          ← 2-col hero grid lives here
    left: <MoveHero />
    right: info panel (title, tags, ProgressStatusPicker, MoveFavouriteButton)
  </MovePlayer>
  <MoveSpecs />         ← extracted outside MovePlayer
  <RelatedMoves />
</main>
```

`MoveSpecs` is moved outside `MovePlayer` so it renders below the hero grid at full width.

`ProgressStatusPicker` receives:

- `moveId: string`
- `initialStatus: LearnStatus | null`
- `isAuthenticated: boolean`

Unauthenticated users: picker is not rendered (same pattern as `MoveFavouriteButton`).

---

## Hero Grid (`MovePlayer.tsx`)

```
grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8
```

**Left column:** `<MoveHero />` — fills the column, `aspect-[16/9]`, `rounded-xl overflow-hidden`.

**Right column:** flex column, `gap-5`, `justify-start`

| Element         | Spec                                                                                                                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Difficulty chip | `rounded-full px-3 py-1 font-sans text-[10px] font-semibold tracking-[0.18em] uppercase` — existing DIFFICULTY_BADGE colours                                                           |
| `<h1>`          | `font-display text-[64px] font-semibold tracking-[-0.04em] leading-[0.95] text-on-surface lowercase`                                                                                   |
| Description     | `font-sans text-base leading-relaxed text-on-surface-variant`                                                                                                                          |
| Tags            | `flex flex-wrap gap-1.5` — each tag: `rounded-full border border-outline-variant/30 px-3 py-1 font-sans text-[10px] font-semibold tracking-[0.18em] uppercase text-on-surface-variant` |
| Actions row     | `flex items-center gap-3 mt-2` — `<MoveFavouriteButton />` (icon only, existing) + `<ProgressStatusPicker />` (flex-1)                                                                 |

---

## Player (`MoveHero.tsx`)

Remove `h-[65vh]` wrapper. The component should fill its container with `aspect-[16/9] w-full rounded-xl overflow-hidden relative`. All internal logic (YouTube iframe, thumbnail, seek, play/pause, gradient overlays) unchanged.

---

## Specs Section (`MoveSpecs.tsx`)

Rendered below the hero grid inside `MovePlayer`'s `max-w-[1280px]` container (no extra wrapper needed):

```tsx
<section aria-label="Move specs" className="mt-8 pb-4">
  <p className="mb-3 font-sans text-[10px] font-semibold tracking-[0.18em] text-on-surface-variant uppercase">
    Specs
  </p>
  {/* existing grid */}
</section>
```

---

## Tabs (`MoveTabs.tsx`)

Gradient underline: change from current to `bg-gradient-to-r from-primary to-[#8458b3]`.

---

## Related Moves (`RelatedMoves.tsx`)

Image-thumbnail cards arranged in a responsive grid:

```
grid grid-cols-2 sm:grid-cols-4 gap-4
```

Each card is a `<Link>` with:

```
group overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container
transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40
```

Top: `aspect-[4/3]` image area — `MoveCardImage` (YouTube thumbnail fallback to `imageUrl`).

Bottom (`p-3`):

- move title: `font-display text-sm font-semibold text-on-surface truncate`
- difficulty label: `text-[10px] font-semibold tracking-widest uppercase mt-1` with `DIFFICULTY_COLOR` mapping (`BEGINNER` → `text-on-secondary-container`, `INTERMEDIATE` → `text-primary`, `ADVANCED` → `text-amber-300`)

---

## ProgressStatusPicker Integration

Component already exists at `src/features/profile/components/ProgressStatusPicker.tsx`.

Wrap it in a thin client component `MoveProgressPicker` in `src/features/moves/components/MoveProgressPicker.tsx`:

```tsx
'use client';
import { useState, useTransition } from 'react';
import type { LearnStatus } from '@/shared/types';
import { updateProgressAction } from '@/features/profile/actions';
import ProgressStatusPicker from '@/features/profile/components/ProgressStatusPicker';

export function MoveProgressPicker({
  moveId,
  initialStatus,
}: {
  moveId: string;
  initialStatus: LearnStatus | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<LearnStatus>(initialStatus ?? 'WANT_TO_LEARN');

  function handleChange(next: LearnStatus) {
    setStatus(next);
    startTransition(() => {
      updateProgressAction(moveId, next);
    });
  }

  return (
    <ProgressStatusPicker
      currentStatus={status}
      onStatusChange={handleChange}
      isPending={isPending}
    />
  );
}
```

`ProgressStatusPicker` props: `currentStatus: LearnStatus`, `onStatusChange: (status: LearnStatus) => void`, `isPending: boolean`.

---

## Accessibility

- `<h1>` remains the single page heading.
- Difficulty chip: `aria-label={difficultyLabel}` for screen readers (text is uppercase, may not read well).
- `MoveProgressPicker` inherits accessibility from the existing `ProgressStatusPicker`.

---

## Out of Scope

- Coach's Note data (remains hardcoded).
- `getRelatedMovesAction` ordering (separate task).
- Footer redesign.
- Mobile-specific layout tweaks beyond responsive grid.
