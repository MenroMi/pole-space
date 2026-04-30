# Move Detail Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Move Detail page to match the new design — 2-column hero grid, integrated ProgressStatusPicker, horizontal related moves cards, updated visual style — while preserving all existing functionality (YouTube playback, seek-to-timestamp, tab navigation, favourite toggle).

**Architecture:** `MovePlayer` becomes the 2-column hero grid (player left, info panel right) and no longer uses `children`. A new `MoveProgressPicker` client component wraps `ProgressStatusPicker` with `useTransition`. `MoveSpecs` renders standalone below the hero in `page.tsx`. `RelatedMoves` switches from image cards to horizontal icon+text cards.

**Tech Stack:** Next.js App Router (RSC + client components), Tailwind CSS v4, Prisma, Vitest + RTL

---

### Task 1: Data layer — add `currentProgress` to `MoveDetail`

**Files:**

- Modify: `src/features/moves/types.ts`
- Modify: `src/features/moves/actions.ts`
- Modify: `src/features/moves/actions.test.ts`

- [ ] **Step 1: Update the mock in `actions.test.ts` to include `userProgress`**

```ts
vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    move: { findUnique: vi.fn() },
    userFavourite: { findMany: vi.fn() },
    userProgress: { findFirst: vi.fn() },
  },
}));
```

Add after the existing mock references:

```ts
const mockProgressFindFirst = prisma.userProgress.findFirst as ReturnType<typeof vi.fn>;
```

Add to `beforeEach`:

```ts
beforeEach(() => {
  vi.clearAllMocks();
  mockProgressFindFirst.mockResolvedValue(null);
});
```

- [ ] **Step 2: Add failing tests for `currentProgress`**

Add to the `getMoveByIdAction` describe block:

```ts
it('returns currentProgress: null when no userId provided', async () => {
  mockFindUnique.mockResolvedValue(move);
  const result = await getMoveByIdAction('move-1');
  expect(result?.currentProgress).toBeNull();
  expect(mockProgressFindFirst).not.toHaveBeenCalled();
});

it('returns currentProgress: null when no UserProgress record exists', async () => {
  mockFindUnique.mockResolvedValue(move);
  mockFavouriteFindMany.mockResolvedValue([]);
  mockProgressFindFirst.mockResolvedValue(null);
  const result = await getMoveByIdAction('move-1', 'user-1');
  expect(result?.currentProgress).toBeNull();
  expect(mockProgressFindFirst).toHaveBeenCalledWith({
    where: { userId: 'user-1', moveId: 'move-1' },
  });
});

it('returns currentProgress from UserProgress record', async () => {
  mockFindUnique.mockResolvedValue(move);
  mockFavouriteFindMany.mockResolvedValue([]);
  mockProgressFindFirst.mockResolvedValue({ status: 'IN_PROGRESS' });
  const result = await getMoveByIdAction('move-1', 'user-1');
  expect(result?.currentProgress).toBe('IN_PROGRESS');
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test src/features/moves/actions.test.ts -- --run
```

Expected: FAIL — `currentProgress` property does not exist yet.

- [ ] **Step 4: Update `types.ts`**

```ts
import type { Move, UserFavourite } from '@prisma/client';
import type { LearnStatus } from '@/shared/types';

export type StepItem = { text: string; timestamp?: number };

export type MoveDetail = Omit<Move, 'stepsData'> & {
  favourites: UserFavourite[];
  stepsData: StepItem[];
  currentProgress: LearnStatus | null;
};
```

- [ ] **Step 5: Update `actions.ts`**

```ts
'use server';
import type { Category } from '@prisma/client';

import { prisma } from '@/shared/lib/prisma';

import type { MoveDetail, StepItem } from './types';

export async function getMoveByIdAction(id: string, userId?: string): Promise<MoveDetail | null> {
  const move = await prisma.move.findUnique({ where: { id } });
  if (!move) return null;

  const [favourites, progressRecord] = await Promise.all([
    userId ? prisma.userFavourite.findMany({ where: { userId, moveId: id } }) : Promise.resolve([]),
    userId
      ? prisma.userProgress.findFirst({ where: { userId, moveId: id } })
      : Promise.resolve(null),
  ]);

  const stepsData = (Array.isArray(move.stepsData) ? move.stepsData : []).filter(
    (s): s is StepItem => {
      if (typeof s !== 'object' || s === null || Array.isArray(s)) return false;
      const obj = s as Record<string, unknown>;
      return (
        typeof obj.text === 'string' &&
        (obj.timestamp === undefined || typeof obj.timestamp === 'number')
      );
    },
  );

  return {
    ...move,
    favourites,
    stepsData,
    currentProgress: progressRecord?.status ?? null,
  };
}

export async function getRelatedMovesAction(category: Category, excludeId: string) {
  return prisma.move.findMany({
    where: { category, id: { not: excludeId } },
    select: { id: true, title: true, difficulty: true, imageUrl: true, youtubeUrl: true },
    take: 4,
  });
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test src/features/moves/actions.test.ts -- --run
```

Expected: all existing + 3 new tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/features/moves/types.ts src/features/moves/actions.ts src/features/moves/actions.test.ts
git commit -m "feat(moves): add currentProgress to MoveDetail — parallel UserProgress fetch"
```

---

### Task 2: `MoveProgressPicker` client component

**Files:**

- Create: `src/features/moves/components/MoveProgressPicker.tsx`
- Create: `src/features/moves/components/MoveProgressPicker.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/features/moves/components/MoveProgressPicker.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/profile/actions', () => ({
  updateProgressAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/profile/components/ProgressStatusPicker', () => ({
  default: vi.fn(
    ({
      currentStatus,
      onStatusChange,
      isPending,
    }: {
      currentStatus: string;
      onStatusChange: (s: string) => void;
      isPending: boolean;
    }) => (
      <div>
        <span data-testid="status">{currentStatus}</span>
        <span data-testid="pending">{String(isPending)}</span>
        <button onClick={() => onStatusChange('LEARNED')}>set learned</button>
      </div>
    ),
  ),
}));

import { updateProgressAction } from '@/features/profile/actions';
import { MoveProgressPicker } from './MoveProgressPicker';

beforeEach(() => vi.clearAllMocks());

describe('MoveProgressPicker', () => {
  it('renders with WANT_TO_LEARN when initialStatus is null', () => {
    render(<MoveProgressPicker moveId="m1" initialStatus={null} />);
    expect(screen.getByTestId('status').textContent).toBe('WANT_TO_LEARN');
  });

  it('renders with provided initialStatus', () => {
    render(<MoveProgressPicker moveId="m1" initialStatus="IN_PROGRESS" />);
    expect(screen.getByTestId('status').textContent).toBe('IN_PROGRESS');
  });

  it('calls updateProgressAction when status changes', async () => {
    const user = userEvent.setup();
    render(<MoveProgressPicker moveId="m1" initialStatus={null} />);
    await user.click(screen.getByRole('button', { name: 'set learned' }));
    expect(updateProgressAction).toHaveBeenCalledWith('m1', 'LEARNED');
  });

  it('updates displayed status optimistically on change', async () => {
    const user = userEvent.setup();
    render(<MoveProgressPicker moveId="m1" initialStatus={null} />);
    await user.click(screen.getByRole('button', { name: 'set learned' }));
    expect(screen.getByTestId('status').textContent).toBe('LEARNED');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test src/features/moves/components/MoveProgressPicker.test.tsx -- --run
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `MoveProgressPicker.tsx`**

Create `src/features/moves/components/MoveProgressPicker.tsx`:

```tsx
'use client';
import { useState, useTransition } from 'react';

import { updateProgressAction } from '@/features/profile/actions';
import ProgressStatusPicker from '@/features/profile/components/ProgressStatusPicker';
import type { LearnStatus } from '@/shared/types';

export function MoveProgressPicker({
  moveId,
  initialStatus,
}: {
  moveId: string;
  initialStatus: LearnStatus | null;
}) {
  const [status, setStatus] = useState<LearnStatus>(initialStatus ?? 'WANT_TO_LEARN');
  const [isPending, startTransition] = useTransition();

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

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/features/moves/components/MoveProgressPicker.test.tsx -- --run
```

Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/features/moves/components/MoveProgressPicker.tsx src/features/moves/components/MoveProgressPicker.test.tsx
git commit -m "feat(moves): MoveProgressPicker — wraps ProgressStatusPicker with useTransition"
```

---

### Task 3: `MoveHero` — change from `h-[65vh]` to `aspect-[16/9]`

**Files:**

- Modify: `src/features/moves/components/MoveHero.tsx`

The existing tests don't assert on layout classes, so no test changes are needed.

- [ ] **Step 1: Change the outer `div` class in `MoveHero.tsx`**

Find this line in `MoveHero.tsx`:

```tsx
<div className="relative h-[65vh] w-full overflow-hidden bg-black">
```

Replace with:

```tsx
<div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-black">
```

- [ ] **Step 2: Run tests to verify nothing broke**

```bash
npm test src/features/moves/components/MoveHero.test.tsx -- --run
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/moves/components/MoveHero.tsx
git commit -m "style(MoveHero): aspect-[16/9] + rounded-xl — fits 2-col hero grid"
```

---

### Task 4: `MovePlayer` — 2-column hero grid + info panel

**Files:**

- Modify: `src/features/moves/components/MovePlayer.tsx`
- Modify: `src/features/moves/components/MovePlayer.test.tsx`

`MovePlayer` loses its `children` prop. It now renders the full hero section: 2-column grid (player left, info panel right) above `MoveTabs`. The info panel contains difficulty chip, title `h1`, description, tags, `MoveFavouriteButton`, and `MoveProgressPicker`.

- [ ] **Step 1: Write failing tests in `MovePlayer.test.tsx`**

Replace the entire file content:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const scrollToMock = vi.fn();
vi.stubGlobal('scrollTo', scrollToMock);

vi.mock('./MoveHero', () => ({
  default: vi.fn(({ seekRequest }: { seekRequest?: { seconds: number } }) => (
    <div data-testid="move-hero" data-seek-to={seekRequest?.seconds ?? ''} />
  )),
}));

vi.mock('./MoveTabs', () => ({
  default: vi.fn(({ onSeek }: { onSeek: (s: number) => void }) => (
    <button type="button" onClick={() => onSeek(45)}>
      seek
    </button>
  )),
}));

vi.mock('./MoveFavouriteButton', () => ({
  default: vi.fn(() => <button type="button">favourite</button>),
}));

vi.mock('./MoveProgressPicker', () => ({
  MoveProgressPicker: vi.fn(() => <div data-testid="progress-picker" />),
}));

import type { StepItem } from '../types';
import MovePlayer from './MovePlayer';

const baseProps = {
  title: 'Fireman Spin',
  youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
  imageUrl: null,
  stepsData: [] as StepItem[],
  difficulty: 'BEGINNER' as const,
  description: 'A graceful spinning move.',
  category: 'SPINS' as const,
  poleType: null,
  moveId: 'move-1',
  isFavourited: false,
  isAuthenticated: true,
  currentProgress: null,
};

describe('MovePlayer', () => {
  beforeEach(() => scrollToMock.mockClear());

  it('renders MoveHero', () => {
    render(<MovePlayer {...baseProps} />);
    expect(screen.getByTestId('move-hero')).toBeInTheDocument();
  });

  it('renders MoveTabs', () => {
    render(<MovePlayer {...baseProps} />);
    expect(screen.getByRole('button', { name: 'seek' })).toBeInTheDocument();
  });

  it('renders the move title as h1', () => {
    render(<MovePlayer {...baseProps} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Fireman Spin' })).toBeInTheDocument();
  });

  it('renders the difficulty chip', () => {
    render(<MovePlayer {...baseProps} />);
    expect(screen.getByText('Beginner')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<MovePlayer {...baseProps} />);
    expect(screen.getByText('A graceful spinning move.')).toBeInTheDocument();
  });

  it('renders the category as a tag', () => {
    render(<MovePlayer {...baseProps} />);
    expect(screen.getByText('Spins')).toBeInTheDocument();
  });

  it('renders poleType as a tag when provided', () => {
    render(<MovePlayer {...baseProps} poleType="STATIC" />);
    expect(screen.getByText('Static')).toBeInTheDocument();
  });

  it('does not render poleType tag when null', () => {
    render(<MovePlayer {...baseProps} poleType={null} />);
    expect(screen.queryByText('Static')).not.toBeInTheDocument();
    expect(screen.queryByText('Spin')).not.toBeInTheDocument();
  });

  it('renders MoveProgressPicker when authenticated', () => {
    render(<MovePlayer {...baseProps} isAuthenticated={true} />);
    expect(screen.getByTestId('progress-picker')).toBeInTheDocument();
  });

  it('does not render MoveProgressPicker when unauthenticated', () => {
    render(<MovePlayer {...baseProps} isAuthenticated={false} />);
    expect(screen.queryByTestId('progress-picker')).not.toBeInTheDocument();
  });

  it('does not render description when null', () => {
    render(<MovePlayer {...baseProps} description={null} />);
    expect(screen.queryByText('A graceful spinning move.')).not.toBeInTheDocument();
  });

  it('seeks immediately when already at top (scrollY === 0)', async () => {
    const user = userEvent.setup();
    render(<MovePlayer {...baseProps} />);
    await user.click(screen.getByRole('button', { name: 'seek' }));
    expect(scrollToMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('move-hero')).toHaveAttribute('data-seek-to', '45');
  });

  it('scrolls to top and seeks after delay when not at top', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('scrollY', 200);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MovePlayer {...baseProps} />);
    await user.click(screen.getByRole('button', { name: 'seek' }));
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(screen.getByTestId('move-hero')).toHaveAttribute('data-seek-to', '');
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByTestId('move-hero')).toHaveAttribute('data-seek-to', '45');
    vi.stubGlobal('scrollY', 0);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test src/features/moves/components/MovePlayer.test.tsx -- --run
```

Expected: FAIL — new props do not exist, info panel not rendered.

- [ ] **Step 3: Rewrite `MovePlayer.tsx`**

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Difficulty, PoleType } from '@prisma/client';
import type { Category, LearnStatus } from '@/shared/types';

import type { StepItem } from '../types';

import MoveFavouriteButton from './MoveFavouriteButton';
import MoveHero from './MoveHero';
import { MoveProgressPicker } from './MoveProgressPicker';
import MoveTabs from './MoveTabs';

const DIFFICULTY_BADGE: Record<Difficulty, { className: string; style?: CSSProperties }> = {
  BEGINNER: { className: 'bg-secondary-container text-on-secondary-container' },
  INTERMEDIATE: { className: 'bg-primary-container text-on-surface' },
  ADVANCED: { className: '', style: { backgroundColor: '#92400e', color: '#fef3c7' } },
};

function formatLabel(value: string) {
  return value
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

type MovePlayerProps = {
  title: string;
  youtubeUrl: string;
  imageUrl: string | null;
  stepsData: StepItem[];
  difficulty: Difficulty;
  description: string | null;
  category: Category;
  poleType: PoleType | null;
  moveId: string;
  isFavourited: boolean;
  isAuthenticated: boolean;
  currentProgress: LearnStatus | null;
};

export default function MovePlayer({
  title,
  youtubeUrl,
  imageUrl,
  stepsData,
  difficulty,
  description,
  category,
  poleType,
  moveId,
  isFavourited,
  isAuthenticated,
  currentProgress,
}: MovePlayerProps) {
  const [seekRequest, setSeekRequest] = useState<{ seconds: number } | null>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  function handleSeek(seconds: number) {
    const request = { seconds };
    if (window.scrollY === 0) {
      setSeekRequest(request);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // 400ms matches the browser's smooth-scroll animation duration
      scrollTimerRef.current = setTimeout(() => setSeekRequest(request), 400);
    }
  }

  const badge = DIFFICULTY_BADGE[difficulty];
  const difficultyLabel = formatLabel(difficulty);

  return (
    <div className="mx-auto max-w-[1280px] px-8 py-8">
      {/* Hero grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: video player */}
        <MoveHero
          title={title}
          youtubeUrl={youtubeUrl}
          imageUrl={imageUrl}
          seekRequest={seekRequest ?? undefined}
        />

        {/* Right: info panel */}
        <div className="flex flex-col gap-5">
          {/* Difficulty chip */}
          <span
            className={`w-fit rounded-full px-3 py-1 font-sans text-[10px] font-semibold tracking-[0.18em] uppercase ${badge.className}`}
            style={badge.style}
          >
            {difficultyLabel}
          </span>

          {/* Title */}
          <h1 className="font-display text-[64px] leading-[0.95] font-semibold tracking-[-0.04em] text-on-surface lowercase">
            {title}
          </h1>

          {/* Description */}
          {description && (
            <p className="font-sans text-base leading-relaxed text-on-surface-variant">
              {description}
            </p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full border border-outline-variant/30 px-3 py-1 font-sans text-[10px] font-semibold tracking-[0.18em] text-on-surface-variant uppercase">
              {formatLabel(category)}
            </span>
            {poleType && (
              <span className="rounded-full border border-outline-variant/30 px-3 py-1 font-sans text-[10px] font-semibold tracking-[0.18em] text-on-surface-variant uppercase">
                {formatLabel(poleType)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-2 flex items-center gap-3">
            <MoveFavouriteButton
              moveId={moveId}
              isFavourited={isFavourited}
              isAuthenticated={isAuthenticated}
            />
            {isAuthenticated && (
              <div className="flex-1">
                <MoveProgressPicker moveId={moveId} initialStatus={currentProgress} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs — full width below the grid */}
      <div className="mt-10">
        <MoveTabs stepsData={stepsData} onSeek={handleSeek} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/features/moves/components/MovePlayer.test.tsx -- --run
```

Expected: all 13 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/moves/components/MovePlayer.tsx src/features/moves/components/MovePlayer.test.tsx
git commit -m "feat(MovePlayer): 2-col hero grid — player left, info panel right"
```

---

### Task 5: `MoveSpecs` — add "Specs" section label

**Files:**

- Modify: `src/features/moves/components/MoveSpecs.tsx`
- Modify: `src/features/moves/components/MoveSpecs.test.tsx`

- [ ] **Step 1: Add failing test**

Add to `MoveSpecs.test.tsx`:

```ts
it('renders "Specs" section label when specs are present', () => {
  render(<MoveSpecs gripType="Twisted" entry={null} duration={null} poleType={null} />);
  expect(screen.getByText('Specs')).toBeInTheDocument();
});

it('does not render "Specs" label when no specs', () => {
  const { container } = render(
    <MoveSpecs gripType={null} entry={null} duration={null} poleType={null} />,
  );
  expect(container).toBeEmptyDOMElement();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test src/features/moves/components/MoveSpecs.test.tsx -- --run
```

Expected: FAIL — "Specs" label not found.

- [ ] **Step 3: Update `MoveSpecs.tsx`**

Replace the return statement:

```tsx
return (
  <section aria-label="Move specs" className="mx-auto max-w-[1280px] px-8 pb-8">
    <p className="mb-3 font-sans text-[10px] font-semibold tracking-[0.18em] text-on-surface-variant uppercase">
      Specs
    </p>
    <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {specs.map(({ label, value }) => (
        <SpecCard key={label} label={label} value={value} />
      ))}
    </dl>
  </section>
);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/features/moves/components/MoveSpecs.test.tsx -- --run
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/moves/components/MoveSpecs.tsx src/features/moves/components/MoveSpecs.test.tsx
git commit -m "style(MoveSpecs): add Specs section label, standalone padding"
```

---

### Task 6: `MoveTabs` — update gradient underline colour

**Files:**

- Modify: `src/features/moves/components/MoveTabs.tsx`

No test changes needed — existing tests don't assert on gradient classes.

- [ ] **Step 1: Update gradient in `MoveTabs.tsx`**

Find:

```tsx
className =
  'absolute -bottom-[1px] h-[2px] bg-gradient-to-r from-primary to-primary-container transition-all duration-300 ease-in-out';
```

Replace with:

```tsx
className =
  'absolute -bottom-[1px] h-[2px] bg-gradient-to-r from-primary to-[#8458b3] transition-all duration-300 ease-in-out';
```

- [ ] **Step 2: Run tests to verify nothing broke**

```bash
npm test src/features/moves/components/MoveTabs.test.tsx -- --run
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/moves/components/MoveTabs.tsx
git commit -m "style(MoveTabs): update gradient underline to from-primary to-[#8458b3]"
```

---

### Task 7: `RelatedMoves` — horizontal icon+text cards

**Files:**

- Modify: `src/features/moves/components/RelatedMoves.tsx`
- Modify: `src/features/moves/components/RelatedMoves.test.tsx`

Cards change from image-based to horizontal: 44×44px letter icon + title + level. No image or thumbnail rendering.

- [ ] **Step 1: Add failing test**

Add to `RelatedMoves.test.tsx`:

```ts
it('renders the first letter of the title in the icon area', () => {
  render(<RelatedMoves moves={[makeMove({ title: 'Fireman Spin' })]} />);
  expect(screen.getByText('F')).toBeInTheDocument();
});

it('does not render an img element', () => {
  const { container } = render(<RelatedMoves moves={[makeMove()]} />);
  expect(container.querySelector('img')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test src/features/moves/components/RelatedMoves.test.tsx -- --run
```

Expected: "renders the first letter" FAIL; "does not render img" FAIL (current renders an img).

- [ ] **Step 3: Rewrite `RelatedMoves.tsx`**

```tsx
import Link from 'next/link';

type RelatedMove = {
  id: string;
  title: string;
  difficulty: string;
  imageUrl: string | null;
  youtubeUrl: string;
};

type RelatedMovesProps = {
  moves: RelatedMove[];
};

export default function RelatedMoves({ moves }: RelatedMovesProps) {
  if (moves.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1280px] px-8 pb-16">
      <p className="mb-3 font-sans text-[10px] font-semibold tracking-[0.18em] text-on-surface-variant uppercase">
        Related moves
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {moves.map((move) => (
          <Link
            key={move.id}
            href={`/moves/${move.id}`}
            className="flex items-center gap-3 rounded-lg border border-outline-variant/15 bg-surface-container p-3 transition-colors hover:border-primary/40"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-surface font-display text-lg text-primary/50">
              {move.title.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-col">
              <p className="truncate font-display text-sm font-medium text-on-surface">
                {move.title}
              </p>
              <p className="font-sans text-[10px] font-semibold tracking-[0.18em] text-on-surface-variant uppercase">
                {move.difficulty}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/features/moves/components/RelatedMoves.test.tsx -- --run
```

Expected: all tests pass (including new ones).

- [ ] **Step 5: Commit**

```bash
git add src/features/moves/components/RelatedMoves.tsx src/features/moves/components/RelatedMoves.test.tsx
git commit -m "feat(RelatedMoves): horizontal icon+text cards — no image thumbnails"
```

---

### Task 8: `page.tsx` — wire everything together

**Files:**

- Modify: `src/app/(main)/moves/[id]/page.tsx`

Remove `DIFFICULTY_BADGE` (moved to `MovePlayer`), pass new props to `MovePlayer`, render `MoveSpecs` standalone below the hero, clean up unused imports.

- [ ] **Step 1: Write the failing test**

Create `src/app/(main)/moves/[id]/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notFound } from 'next/navigation';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/shared/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/features/moves', () => ({
  getMoveByIdAction: vi.fn(),
  getRelatedMovesAction: vi.fn(),
  MovePlayer: vi.fn(({ title }: { title: string }) => <div data-testid="player">{title}</div>),
  MoveFavouriteButton: vi.fn(() => null),
  MoveSpecs: vi.fn(() => <div data-testid="specs" />),
}));
vi.mock('@/features/moves/components/MoveBreadcrumb', () => ({
  default: vi.fn(() => <nav data-testid="breadcrumb" />),
}));
vi.mock('@/features/moves/components/RelatedMoves', () => ({
  default: vi.fn(() => <div data-testid="related" />),
}));

import { auth } from '@/shared/lib/auth';
import { getMoveByIdAction, getRelatedMovesAction } from '@/features/moves';
import MoveDetailPage from './page';

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockGetMove = getMoveByIdAction as ReturnType<typeof vi.fn>;
const mockGetRelated = getRelatedMovesAction as ReturnType<typeof vi.fn>;

const move = {
  id: 'move-1',
  title: 'Fireman Spin',
  category: 'SPINS',
  difficulty: 'BEGINNER',
  poleType: null,
  description: 'A graceful move.',
  gripType: 'Twisted',
  entry: null,
  duration: 'Short',
  youtubeUrl: 'https://youtube.com/watch?v=abc',
  imageUrl: null,
  stepsData: [],
  favourites: [],
  currentProgress: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth.mockResolvedValue(null);
  mockGetMove.mockResolvedValue(move);
  mockGetRelated.mockResolvedValue([]);
});

describe('MoveDetailPage', () => {
  it('calls notFound when move does not exist', async () => {
    mockGetMove.mockResolvedValue(null);
    await MoveDetailPage({ params: Promise.resolve({ id: 'bad-id' }) });
    expect(notFound).toHaveBeenCalled();
  });

  it('renders MovePlayer with title', async () => {
    render(await MoveDetailPage({ params: Promise.resolve({ id: 'move-1' }) }));
    expect(screen.getByTestId('player')).toHaveTextContent('Fireman Spin');
  });

  it('renders MoveSpecs', async () => {
    render(await MoveDetailPage({ params: Promise.resolve({ id: 'move-1' }) }));
    expect(screen.getByTestId('specs')).toBeInTheDocument();
  });

  it('renders RelatedMoves', async () => {
    render(await MoveDetailPage({ params: Promise.resolve({ id: 'move-1' }) }));
    expect(screen.getByTestId('related')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test "src/app/(main)/moves/\[id\]/page.test.tsx" -- --run
```

Expected: FAIL — page does not pass new props to MovePlayer.

- [ ] **Step 3: Rewrite `page.tsx`**

```tsx
import { notFound } from 'next/navigation';

import { getMoveByIdAction, getRelatedMovesAction, MovePlayer, MoveSpecs } from '@/features/moves';
import MoveBreadcrumb from '@/features/moves/components/MoveBreadcrumb';
import RelatedMoves from '@/features/moves/components/RelatedMoves';
import { auth } from '@/shared/lib/auth';

export default async function MoveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  const move = await getMoveByIdAction(id, userId);

  if (!move) notFound();

  const related = await getRelatedMovesAction(move.category, id);

  const isFavourited = move.favourites.length > 0;
  const isAuthenticated = !!userId;

  return (
    <main>
      <MoveBreadcrumb category={move.category} moveName={move.title} />
      <MovePlayer
        title={move.title}
        youtubeUrl={move.youtubeUrl}
        imageUrl={move.imageUrl}
        stepsData={move.stepsData}
        difficulty={move.difficulty}
        description={move.description}
        category={move.category}
        poleType={move.poleType}
        moveId={move.id}
        isFavourited={isFavourited}
        isAuthenticated={isAuthenticated}
        currentProgress={move.currentProgress}
      />
      <MoveSpecs
        gripType={move.gripType}
        entry={move.entry}
        duration={move.duration}
        poleType={move.poleType}
      />
      <RelatedMoves moves={related} />
    </main>
  );
}
```

- [ ] **Step 4: Ensure `MovePlayer` and `MoveSpecs` are exported from the feature index**

Check `src/features/moves/index.ts` — confirm `MovePlayer` and `MoveSpecs` are exported. If `MoveSpecs` is missing from the barrel, add it:

```ts
export { default as MoveSpecs } from './components/MoveSpecs';
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test "src/app/(main)/moves/\[id\]/page.test.tsx" -- --run
```

Expected: 4 passing.

- [ ] **Step 6: Run full test suite**

```bash
npm test -- --run
```

Expected: all tests pass (baseline + all new tests).

- [ ] **Step 7: Commit**

```bash
git add src/app/(main)/moves/\[id\]/page.tsx src/app/(main)/moves/\[id\]/page.test.tsx src/features/moves/index.ts
git commit -m "feat(move-detail): wire redesigned page — 2-col hero, standalone specs, ProgressPicker"
```
