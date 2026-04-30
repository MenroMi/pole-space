# Progress Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a three-tab Progress page (In Progress / Want to Learn / Learned) with optimistic status changes, replacing the current redirect stub.

**Architecture:** `ProgressTracker` is the single client component that owns `useOptimistic` state for the entire progress list and passes `onStatusChange` callbacks down to per-tab card components. The RSC page fetches all progress at once and passes it as `initialProgress`. Server actions gain `revalidatePath('/profile/progress')` so the RSC re-fetches fresh data after mutations; `router.refresh()` inside the transition ensures `useOptimistic` settles without a visible flash.

**Tech Stack:** Next.js 16 App Router, React `useOptimistic` + `useTransition`, Prisma 7, Tailwind CSS v4, Vitest + RTL.

---

## File Map

| File                                                       | Status | Role                                                                                           |
| ---------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `src/features/profile/actions.ts`                          | Modify | Add `revalidatePath('/profile/progress')` to `updateProgressAction` and `removeProgressAction` |
| `src/features/profile/actions.test.ts`                     | Modify | Assert new revalidation calls                                                                  |
| `src/features/profile/components/ProgressCard.tsx`         | Modify | Remove internal server-action calls; accept `onStatusChange`+`isPending` props                 |
| `src/features/profile/components/WantToLearnRow.tsx`       | Create | Compact horizontal row for Want to Learn tab                                                   |
| `src/features/profile/components/LearnedCard.tsx`          | Create | Portrait achievement card for Learned grid tab                                                 |
| `src/features/profile/components/ProgressTracker.tsx`      | Create | Main client component: tabs, search, optimistic list, empty states                             |
| `src/features/profile/components/ProgressTracker.test.tsx` | Create | Tab switching, counts, search, empty states                                                    |
| `src/app/(main)/profile/progress/page.tsx`                 | Modify | Replace redirect with RSC data fetch → `<ProgressTracker />`                                   |
| `src/features/profile/components/ProfileAside.tsx`         | Modify | Remove `disabled: true` from the Progress nav link                                             |

---

## Task 1: Add `revalidatePath('/profile/progress')` + update tests

**Files:**

- Modify: `src/features/profile/actions.ts:36-53`
- Modify: `src/features/profile/actions.test.ts`

- [x] **Step 1: Update tests first (TDD)**

In `src/features/profile/actions.test.ts`, find the two "revalidates both /profile and /moves/[id]" tests (one for `updateProgressAction`, one for `removeProgressAction`) and add the `/profile/progress` assertion to each:

```ts
// inside describe('updateProgressAction') — the revalidation test
it('revalidates both /profile and /moves/[id]', async () => {
  mockAuth.mockResolvedValue(session);
  mockUpsert.mockResolvedValue({ id: 'progress-1' });
  await updateProgressAction('move-1', 'IN_PROGRESS');
  expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
  expect(mockRevalidatePath).toHaveBeenCalledWith('/moves/move-1');
  expect(mockRevalidatePath).toHaveBeenCalledWith('/profile/progress');
});

// inside describe('removeProgressAction') — the revalidation test
it('revalidates both /profile and /moves/[id]', async () => {
  mockAuth.mockResolvedValue(session);
  await removeProgressAction('move-1');
  expect(mockRevalidatePath).toHaveBeenCalledWith('/profile');
  expect(mockRevalidatePath).toHaveBeenCalledWith('/moves/move-1');
  expect(mockRevalidatePath).toHaveBeenCalledWith('/profile/progress');
});
```

- [x] **Step 2: Run failing tests**

```bash
npx vitest run src/features/profile/actions.test.ts --reporter=verbose 2>&1 | tail -20
```

Expected: 2 failing tests about missing `/profile/progress` revalidation.

- [x] **Step 3: Implement — add `revalidatePath('/profile/progress')` to both actions**

In `src/features/profile/actions.ts`, update `updateProgressAction`:

```ts
export async function updateProgressAction(moveId: string, status: LearnStatus) {
  const userId = await requireAuth();
  const result = await prisma.userProgress.upsert({
    where: { userId_moveId: { userId, moveId } },
    create: { userId, moveId, status },
    update: { status },
  });
  revalidatePath('/profile');
  revalidatePath('/profile/progress');
  revalidatePath('/moves/' + moveId);
  return result;
}
```

And `removeProgressAction`:

```ts
export async function removeProgressAction(moveId: string) {
  const userId = await requireAuth();
  await prisma.userProgress.deleteMany({ where: { userId, moveId } });
  revalidatePath('/profile');
  revalidatePath('/profile/progress');
  revalidatePath('/moves/' + moveId);
}
```

- [x] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/features/profile/actions.test.ts --reporter=verbose 2>&1 | tail -10
```

Expected: all tests pass.

- [x] **Step 5: Commit**

```bash
git add src/features/profile/actions.ts src/features/profile/actions.test.ts
git commit -m "feat(progress): revalidate /profile/progress on status mutations"
```

---

## Task 2: Refactor `ProgressCard` — accept callbacks, remove internal server calls

**Files:**

- Modify: `src/features/profile/components/ProgressCard.tsx`

ProgressCard currently imports and calls `removeProgressAction`/`updateProgressAction` directly and owns a `useTransition`. The parent (`ProgressTracker`) will own optimistic state and server calls. ProgressCard becomes a pure display component.

- [x] **Step 1: Replace `ProgressCard.tsx` with callback-based version**

```tsx
'use client';
import { ImageOff } from 'lucide-react';
import Image from 'next/image';

import type { LearnStatus } from '@/shared/types';

import type { ProgressWithMove } from '../types';
import ProgressStatusPicker from './ProgressStatusPicker';

const DIFFICULTY_BADGE: Record<string, { className: string; style?: React.CSSProperties }> = {
  BEGINNER: { className: 'bg-secondary-container text-on-secondary-container' },
  INTERMEDIATE: { className: 'bg-primary-container text-on-surface' },
  ADVANCED: { className: '', style: { backgroundColor: '#92400e', color: '#fef3c7' } },
};

type ProgressCardProps = {
  item: ProgressWithMove;
  onStatusChange: (moveId: string, status: LearnStatus | null) => void;
  isPending: boolean;
};

export default function ProgressCard({ item, onStatusChange, isPending }: ProgressCardProps) {
  const badge = DIFFICULTY_BADGE[item.move.difficulty] ?? DIFFICULTY_BADGE.BEGINNER;

  return (
    <div className="flex gap-4 rounded-xl bg-surface-container p-4">
      <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-accent">
        {item.move.imageUrl ? (
          <Image src={item.move.imageUrl} alt={item.move.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-6 w-6 text-on-surface-variant" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
            style={badge.style}
          >
            {item.move.difficulty}
          </span>
          <h3 className="font-display font-semibold text-on-surface">{item.move.title}</h3>
        </div>
        <ProgressStatusPicker
          currentStatus={item.status}
          onStatusChange={(status) => onStatusChange(item.moveId, status)}
          isPending={isPending}
        />
      </div>
    </div>
  );
}
```

- [x] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1; echo "EXIT: $?"
```

Expected: `EXIT: 0`.

- [x] **Step 3: Run full test suite**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -10
```

Expected: all tests pass (ProgressCard had no tests; ProgressStatusPicker tests unaffected).

- [x] **Step 4: Commit**

```bash
git add src/features/profile/components/ProgressCard.tsx
git commit -m "refactor(progress): ProgressCard accepts onStatusChange+isPending props"
```

---

## Task 3: Create `WantToLearnRow`

**Files:**

- Create: `src/features/profile/components/WantToLearnRow.tsx`

Compact horizontal row for the Want to Learn tab. Shows a small thumbnail, move title, difficulty chip, and a `ProgressStatusPicker` (so the user can flip to In Progress without leaving the page).

- [x] **Step 1: Create `WantToLearnRow.tsx`**

```tsx
import Image from 'next/image';
import Link from 'next/link';

import type { LearnStatus } from '@/shared/types';

import type { ProgressWithMove } from '../types';
import ProgressStatusPicker from './ProgressStatusPicker';

const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: '#84d099',
  INTERMEDIATE: '#dcb8ff',
  ADVANCED: '#f59e0b',
};

type WantToLearnRowProps = {
  item: ProgressWithMove;
  onStatusChange: (moveId: string, status: LearnStatus | null) => void;
  isPending: boolean;
};

export default function WantToLearnRow({ item, onStatusChange, isPending }: WantToLearnRowProps) {
  const color = DIFFICULTY_COLOR[item.move.difficulty] ?? DIFFICULTY_COLOR.BEGINNER;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-outline-variant/15 bg-surface-container p-3.5">
      <Link
        href={`/moves/${item.moveId}`}
        className="bg-surface-container-highest relative h-12 w-[72px] shrink-0 overflow-hidden rounded-lg"
        tabIndex={-1}
        aria-hidden="true"
      >
        {item.move.imageUrl ? (
          <Image
            src={item.move.imageUrl}
            alt={item.move.title}
            fill
            className="object-cover opacity-80"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-display text-xl font-semibold text-primary/30">
            {item.move.title.charAt(0).toUpperCase()}
          </div>
        )}
      </Link>

      <Link href={`/moves/${item.moveId}`} className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-medium text-on-surface transition-colors hover:text-primary">
          {item.move.title}
        </p>
        <span
          className="mt-0.5 inline-block rounded-full px-2 py-0.5 font-sans text-[9px] font-bold tracking-[0.14em] uppercase"
          style={{ background: `${color}18`, color }}
        >
          {item.move.difficulty.charAt(0) + item.move.difficulty.slice(1).toLowerCase()}
        </span>
      </Link>

      <div className="w-[260px] shrink-0">
        <ProgressStatusPicker
          currentStatus={item.status}
          onStatusChange={(status) => onStatusChange(item.moveId, status)}
          isPending={isPending}
        />
      </div>
    </div>
  );
}
```

- [x] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1; echo "EXIT: $?"
```

Expected: `EXIT: 0`.

- [x] **Step 3: Commit**

```bash
git add src/features/profile/components/WantToLearnRow.tsx
git commit -m "feat(progress): add WantToLearnRow component"
```

---

## Task 4: Create `LearnedCard`

**Files:**

- Create: `src/features/profile/components/LearnedCard.tsx`

Portrait achievement card for the Learned grid. Same 4:5 ratio as `FavouriteCard`. No status picker (the tab is celebratory; status change is possible via the move detail page). Uses YouTube thumbnail as fallback, same `naturalWidth ≤ 120` guard as `FavouriteCardImage`.

- [x] **Step 1: Create `LearnedCard.tsx`**

```tsx
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { extractVideoId } from '@/features/moves/lib/youtube';

import type { ProgressWithMove } from '../types';

const DIFFICULTY_BADGE: Record<string, { className: string; style?: React.CSSProperties }> = {
  BEGINNER: { className: 'bg-secondary-container text-on-secondary-container' },
  INTERMEDIATE: { className: 'bg-primary-container text-on-surface' },
  ADVANCED: { className: '', style: { backgroundColor: '#92400e', color: '#fef3c7' } },
};

function ThumbImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100"
      onLoad={(e) => {
        if (e.currentTarget.naturalWidth <= 120) setFailed(true);
      }}
      onError={() => setFailed(true)}
    />
  );
}

type LearnedCardProps = {
  item: ProgressWithMove;
};

export default function LearnedCard({ item }: LearnedCardProps) {
  const badge = DIFFICULTY_BADGE[item.move.difficulty] ?? DIFFICULTY_BADGE.BEGINNER;
  const videoId = extractVideoId(item.move.youtubeUrl);
  const thumb =
    item.move.imageUrl ?? (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

  return (
    <Link
      href={`/moves/${item.moveId}`}
      className="group relative block overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container transition-all duration-240 hover:-translate-y-[3px] hover:border-primary/35"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        {thumb ? (
          <ThumbImage src={thumb} alt={item.move.title} />
        ) : (
          <div className="to-surface-container-highest flex h-full w-full items-center justify-center bg-linear-to-br from-surface-container">
            <span className="font-display text-5xl font-semibold text-primary/20">
              {item.move.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start bg-linear-to-b from-surface/70 to-transparent p-3">
          <span
            className={`rounded-full px-3 py-1 font-sans text-[10px] font-bold tracking-[0.16em] uppercase ${badge.className}`}
            style={badge.style}
          >
            {item.move.difficulty.charAt(0) + item.move.difficulty.slice(1).toLowerCase()}
          </span>
        </div>
      </div>

      <div className="p-3.5 pb-4">
        <h3 className="font-display text-base font-semibold tracking-tight text-on-surface lowercase">
          {item.move.title.toLowerCase()}
        </h3>
      </div>
    </Link>
  );
}
```

- [x] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1; echo "EXIT: $?"
```

Expected: `EXIT: 0`.

- [x] **Step 3: Commit**

```bash
git add src/features/profile/components/LearnedCard.tsx
git commit -m "feat(progress): add LearnedCard achievement grid component"
```

---

## Task 5: Create `ProgressTracker` + tests

**Files:**

- Create: `src/features/profile/components/ProgressTracker.tsx`
- Create: `src/features/profile/components/ProgressTracker.test.tsx`

Main client component. Owns `useOptimistic` for the full progress list. Renders the page header, tab bar, search input, and per-tab content. Calls `router.refresh()` after each server action so the RSC re-fetches fresh `initialProgress`.

- [x] **Step 1: Write failing tests first**

Create `src/features/profile/components/ProgressTracker.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgressTracker from './ProgressTracker';
import type { ProgressWithMove } from '../types';

vi.mock('../actions', () => ({
  updateProgressAction: vi.fn().mockResolvedValue({ success: true }),
  removeProgressAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function makeMove(id: string, title: string, difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED') {
  return {
    id,
    title,
    difficulty,
    imageUrl: null,
    youtubeUrl: 'https://youtube.com/watch?v=abc',
    description: null,
    category: 'STATIC' as const,
    poleTypes: [],
    stepsData: [],
    gripType: null,
    entry: null,
    duration: null,
    coachNote: null,
    coachNoteAuthor: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

const mockProgress: ProgressWithMove[] = [
  {
    id: 'p1',
    userId: 'u1',
    moveId: 'm1',
    status: 'IN_PROGRESS',
    move: makeMove('m1', 'Fireman Spin', 'BEGINNER'),
  },
  {
    id: 'p2',
    userId: 'u1',
    moveId: 'm2',
    status: 'WANT_TO_LEARN',
    move: makeMove('m2', 'Butterfly', 'INTERMEDIATE'),
  },
  {
    id: 'p3',
    userId: 'u1',
    moveId: 'm3',
    status: 'LEARNED',
    move: makeMove('m3', 'Crucifix', 'BEGINNER'),
  },
];

beforeEach(() => vi.clearAllMocks());

describe('ProgressTracker', () => {
  it('shows "In Progress" tab active by default and renders its moves', () => {
    render(<ProgressTracker initialProgress={mockProgress} userName="Mira" />);
    expect(screen.getByText('Fireman Spin')).toBeInTheDocument();
    expect(screen.queryByText('Butterfly')).not.toBeInTheDocument();
    expect(screen.queryByText('Crucifix')).not.toBeInTheDocument();
  });

  it('displays correct counts on tab buttons', () => {
    render(<ProgressTracker initialProgress={mockProgress} userName={null} />);
    expect(screen.getByRole('button', { name: /in progress/i })).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: /want to learn/i })).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: /learned/i })).toHaveTextContent('1');
  });

  it('shows Want to Learn moves after clicking that tab', async () => {
    const user = userEvent.setup();
    render(<ProgressTracker initialProgress={mockProgress} userName={null} />);
    await user.click(screen.getByRole('button', { name: /want to learn/i }));
    expect(screen.getByText('Butterfly')).toBeInTheDocument();
    expect(screen.queryByText('Fireman Spin')).not.toBeInTheDocument();
  });

  it('shows Learned moves after clicking that tab', async () => {
    const user = userEvent.setup();
    render(<ProgressTracker initialProgress={mockProgress} userName={null} />);
    await user.click(screen.getByRole('button', { name: /learned/i }));
    expect(screen.getByText('Crucifix')).toBeInTheDocument();
    expect(screen.queryByText('Fireman Spin')).not.toBeInTheDocument();
  });

  it('filters moves by search query within the active tab', async () => {
    const user = userEvent.setup();
    const progress: ProgressWithMove[] = [
      {
        id: 'p1',
        userId: 'u1',
        moveId: 'm1',
        status: 'IN_PROGRESS',
        move: makeMove('m1', 'Fireman Spin', 'BEGINNER'),
      },
      {
        id: 'p4',
        userId: 'u1',
        moveId: 'm4',
        status: 'IN_PROGRESS',
        move: makeMove('m4', 'Pole Sit', 'BEGINNER'),
      },
    ];
    render(<ProgressTracker initialProgress={progress} userName={null} />);
    await user.type(screen.getByPlaceholderText(/search moves/i), 'fire');
    expect(screen.getByText('Fireman Spin')).toBeInTheDocument();
    expect(screen.queryByText('Pole Sit')).not.toBeInTheDocument();
  });

  it('shows empty state when In Progress tab has no moves', () => {
    const progress: ProgressWithMove[] = [
      {
        id: 'p2',
        userId: 'u1',
        moveId: 'm2',
        status: 'WANT_TO_LEARN',
        move: makeMove('m2', 'Butterfly', 'INTERMEDIATE'),
      },
    ];
    render(<ProgressTracker initialProgress={progress} userName={null} />);
    expect(screen.getByText(/nothing in progress yet/i)).toBeInTheDocument();
  });

  it('shows no-match message when search has no results', async () => {
    const user = userEvent.setup();
    render(<ProgressTracker initialProgress={mockProgress} userName={null} />);
    await user.type(screen.getByPlaceholderText(/search moves/i), 'xyznotamove');
    expect(screen.getByText(/no moves match/i)).toBeInTheDocument();
  });

  it('shows total tracked count in header', () => {
    render(<ProgressTracker initialProgress={mockProgress} userName="Mira" />);
    expect(screen.getByText(/3 tracked/i)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run to confirm all tests fail**

```bash
npx vitest run src/features/profile/components/ProgressTracker.test.tsx 2>&1 | tail -15
```

Expected: FAIL — module not found.

- [x] **Step 3: Create `ProgressTracker.tsx`**

```tsx
'use client';
import { ChevronRight, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useOptimistic, useState, useTransition } from 'react';

import type { LearnStatus } from '@/shared/types';

import { removeProgressAction, updateProgressAction } from '../actions';
import type { ProgressWithMove } from '../types';
import LearnedCard from './LearnedCard';
import ProgressCard from './ProgressCard';
import WantToLearnRow from './WantToLearnRow';

const DIFFICULTY_ORDER: Record<string, number> = {
  BEGINNER: 0,
  INTERMEDIATE: 1,
  ADVANCED: 2,
};

type Tab = 'in_progress' | 'want_to_learn' | 'learned';

type ProgressTrackerProps = {
  initialProgress: ProgressWithMove[];
  userName: string | null;
};

function EmptyTab({ tab }: { tab: Tab }) {
  if (tab === 'in_progress')
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-outline-variant/40 px-6 py-20 text-center">
        <p
          className="font-display text-[22px] text-on-surface"
          style={{ letterSpacing: '-0.01em' }}
        >
          Nothing in progress yet.
        </p>
        <p className="mt-1.5 max-w-xs font-sans text-sm text-on-surface-variant">
          Open any move and set it to In Progress to start tracking it here.
        </p>
        <Link href="/catalog" className="mt-4 font-sans text-sm text-primary hover:underline">
          Browse the catalog →
        </Link>
      </div>
    );

  if (tab === 'want_to_learn')
    return (
      <div className="flex flex-col items-center rounded-xl border border-dashed border-outline-variant/40 px-6 py-20 text-center">
        <p
          className="font-display text-[22px] text-on-surface"
          style={{ letterSpacing: '-0.01em' }}
        >
          Your wishlist is empty.
        </p>
        <p className="mt-1.5 max-w-xs font-sans text-sm text-on-surface-variant">
          Mark moves as "Want to Learn" while browsing the catalog.
        </p>
        <Link href="/catalog" className="mt-4 font-sans text-sm text-primary hover:underline">
          Browse the catalog →
        </Link>
      </div>
    );

  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-outline-variant/40 px-6 py-20 text-center">
      <p className="font-display text-[22px] text-on-surface" style={{ letterSpacing: '-0.01em' }}>
        No mastered moves yet.
      </p>
      <p className="mt-1.5 max-w-xs font-sans text-sm text-on-surface-variant">
        When you master a move, mark it as "Learned" to see it here.
      </p>
    </div>
  );
}

export default function ProgressTracker({ initialProgress, userName }: ProgressTrackerProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('in_progress');
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const [optimisticProgress, updateOptimistic] = useOptimistic(
    initialProgress,
    (state, action: { moveId: string; status: LearnStatus | null }) => {
      if (action.status === null) return state.filter((p) => p.moveId !== action.moveId);
      return state.map((p) =>
        p.moveId === action.moveId ? { ...p, status: action.status as LearnStatus } : p,
      );
    },
  );

  function handleStatusChange(moveId: string, status: LearnStatus | null) {
    startTransition(async () => {
      updateOptimistic({ moveId, status });
      if (status === null) await removeProgressAction(moveId);
      else await updateProgressAction(moveId, status);
      router.refresh();
    });
  }

  const counts = useMemo(
    () => ({
      in_progress: optimisticProgress.filter((p) => p.status === 'IN_PROGRESS').length,
      want_to_learn: optimisticProgress.filter((p) => p.status === 'WANT_TO_LEARN').length,
      learned: optimisticProgress.filter((p) => p.status === 'LEARNED').length,
    }),
    [optimisticProgress],
  );

  const filtered = useMemo(() => {
    const byTab = optimisticProgress.filter((p) => {
      if (tab === 'in_progress') return p.status === 'IN_PROGRESS';
      if (tab === 'want_to_learn') return p.status === 'WANT_TO_LEARN';
      return p.status === 'LEARNED';
    });
    const searched = query
      ? byTab.filter((p) => p.move.title.toLowerCase().includes(query.toLowerCase()))
      : byTab;
    if (tab === 'want_to_learn') {
      return [...searched].sort(
        (a, b) =>
          (DIFFICULTY_ORDER[a.move.difficulty] ?? 0) - (DIFFICULTY_ORDER[b.move.difficulty] ?? 0),
      );
    }
    return searched;
  }, [optimisticProgress, tab, query]);

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'in_progress', label: 'In Progress', count: counts.in_progress },
    { id: 'want_to_learn', label: 'Want to Learn', count: counts.want_to_learn },
    { id: 'learned', label: 'Learned', count: counts.learned },
  ];

  return (
    <div className="px-6 pb-24 md:px-12">
      {/* Breadcrumb */}
      <div className="mt-8 flex items-center gap-1.5 font-sans text-xs text-on-surface-variant">
        <Link
          href="/profile"
          className="text-on-surface-variant/80 transition-colors hover:text-on-surface"
        >
          Profile
        </Link>
        <ChevronRight className="h-3 w-3 opacity-50" />
        <span className="font-semibold tracking-[0.1em] text-primary uppercase">Progress</span>
      </div>

      {/* Page header */}
      <div className="mt-5 flex flex-col gap-8">
        <div>
          <p className="mb-3 font-sans text-[10px] font-semibold tracking-[0.18em] text-on-surface-variant uppercase">
            {optimisticProgress.length} tracked{userName ? ` · ${userName}` : ''}
          </p>
          <h1 className="font-display text-5xl leading-[0.95] font-semibold tracking-[-0.04em] text-on-surface lowercase md:text-[64px]">
            your <em className="font-medium text-primary italic not-italic">journey</em>
          </h1>
          <p className="mt-3.5 max-w-[460px] font-sans text-base leading-relaxed text-on-surface-variant">
            Track what you&apos;re learning and celebrate what you&apos;ve mastered.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/30 pt-5">
          {/* Search */}
          <div className="relative w-[280px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant/60" />
            <input
              aria-label="Search moves"
              placeholder="Search moves..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-outline-variant/60 bg-transparent px-9 py-2.5 font-sans text-[13px] text-on-surface outline-none placeholder:text-on-surface-variant/40 focus:border-primary/50"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 flex h-[22px] w-[22px] -translate-y-1/2 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-on-surface-variant/60 hover:text-on-surface"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Tab picker */}
          <div className="inline-flex gap-0 rounded-lg border border-outline-variant/60 p-[3px]">
            {TABS.map(({ id, label, count }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
                  setQuery('');
                }}
                className={`cursor-pointer rounded-md border-0 px-3 py-1.5 font-sans text-[11px] font-semibold tracking-[0.08em] uppercase transition-all duration-200 ${
                  tab === id
                    ? 'bg-primary/14 text-primary'
                    : 'bg-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {label}{' '}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                    tab === id
                      ? 'bg-primary/20 text-primary'
                      : 'bg-surface-container-highest text-on-surface-variant/60'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-9">
        {filtered.length === 0 && !query && <EmptyTab tab={tab} />}

        {filtered.length === 0 && query && (
          <div className="py-20 text-center font-sans text-sm text-on-surface-variant">
            No moves match &ldquo;{query}&rdquo;.
          </div>
        )}

        {filtered.length > 0 && tab === 'in_progress' && (
          <div className="flex flex-col gap-3">
            {filtered.map((item) => (
              <ProgressCard
                key={item.id}
                item={item}
                onStatusChange={handleStatusChange}
                isPending={isPending}
              />
            ))}
          </div>
        )}

        {filtered.length > 0 && tab === 'want_to_learn' && (
          <div className="flex flex-col gap-2">
            {filtered.map((item) => (
              <WantToLearnRow
                key={item.id}
                item={item}
                onStatusChange={handleStatusChange}
                isPending={isPending}
              />
            ))}
          </div>
        )}

        {filtered.length > 0 && tab === 'learned' && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[18px]">
            {filtered.map((item) => (
              <LearnedCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 4: Run tests — expect all pass**

```bash
npx vitest run src/features/profile/components/ProgressTracker.test.tsx --reporter=verbose 2>&1 | tail -20
```

Expected: 7 passing tests.

- [x] **Step 5: Run full suite**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -10
```

Expected: all tests pass.

- [x] **Step 6: Typecheck**

```bash
npx tsc --noEmit 2>&1; echo "EXIT: $?"
```

Expected: `EXIT: 0`.

- [x] **Step 7: Commit**

```bash
git add src/features/profile/components/ProgressTracker.tsx src/features/profile/components/ProgressTracker.test.tsx
git commit -m "feat(progress): ProgressTracker with 3-tab layout and optimistic status changes"
```

---

## Task 6: Wire up the page RSC + unlock ProfileAside

**Files:**

- Modify: `src/app/(main)/profile/progress/page.tsx`
- Modify: `src/features/profile/components/ProfileAside.tsx`

- [x] **Step 1: Replace progress page**

Replace `src/app/(main)/profile/progress/page.tsx` with:

```tsx
import { auth } from '@/shared/lib/auth';
import { getUserProgressAction } from '@/features/profile';
import ProgressTracker from '@/features/profile/components/ProgressTracker';

export default async function ProgressPage() {
  const [progress, session] = await Promise.all([getUserProgressAction(), auth()]);
  const firstName = session?.user?.name?.split(' ')[0] ?? null;
  return <ProgressTracker initialProgress={progress} userName={firstName} />;
}
```

- [x] **Step 2: Unlock the Progress nav link in `ProfileAside.tsx`**

In `src/features/profile/components/ProfileAside.tsx`, find the progress entry and remove `disabled: false` → set it to `false` (it's already `disabled: true`; change to `disabled: false`):

```ts
// Change this:
{
  href: '/profile/progress',
  label: 'Progress',
  icon: TrendingUp,
  matches: ['/profile/progress'],
  disabled: true,
},
// To:
{
  href: '/profile/progress',
  label: 'Progress',
  icon: TrendingUp,
  matches: ['/profile/progress'],
  disabled: false,
},
```

- [x] **Step 3: Typecheck**

```bash
npx tsc --noEmit 2>&1; echo "EXIT: $?"
```

Expected: `EXIT: 0`.

- [x] **Step 4: Run full test suite**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -10
```

Expected: all tests pass.

- [x] **Step 5: Commit**

```bash
git add src/app/\(main\)/profile/progress/page.tsx src/features/profile/components/ProfileAside.tsx
git commit -m "feat(progress): wire up progress page and unlock nav link"
```

---

## Self-Review

**Spec coverage check:**

- ✅ Three tabs: In Progress, Want to Learn, Learned
- ✅ Tab counts displayed
- ✅ In Progress: full ProgressCard with status picker visible
- ✅ Want to Learn: sorted by difficulty (BEGINNER first), compact rows with status picker
- ✅ Learned: portrait achievement grid
- ✅ Optimistic status changes (move between tabs instantly)
- ✅ `router.refresh()` after mutations for RSC resync
- ✅ `revalidatePath('/profile/progress')` on mutations
- ✅ Search within active tab
- ✅ Empty states per tab (with catalog links for empty In Progress + Want to Learn)
- ✅ No-match state for search
- ✅ ProfileAside unlocked
- ✅ Tests for all tab/search/empty behaviours

**Placeholder scan:** None found — all code blocks are complete.

**Type consistency:**

- `ProgressCardProps.onStatusChange: (moveId: string, status: LearnStatus | null) => void` — used identically in WantToLearnRow and ProgressCard ✅
- `ProgressWithMove` imported from `../types` in all components ✅
- `Tab` type `'in_progress' | 'want_to_learn' | 'learned'` defined in ProgressTracker and used only there ✅
- `DIFFICULTY_ORDER` defined and used only in ProgressTracker ✅

---

## Post-Plan Work (2026-04-30)

Выполнено в той же сессии после завершения Tasks 1–6.

### framer-motion animations

- **`src/shared/lib/motion.ts`** (новый файл) — общие `cardVariants` + `tabContentVariants`, импортируются тремя компонентами вместо copy-paste.
- **`ProgressTracker`** — `AnimatePresence initial={false}` на empty/no-match states; `motion.div layout="position"` на карточках; `tabContentVariants` (`AnimatePresence mode="wait"`) на панелях табов; `pointerEvents: 'none'` в exit чтобы не блокировать клики; instant exit для последней карточки (`filtered.length === 1`).
- **`FavouriteMovesGallery`** — аналогичный паттерн; `useCallback` на `handleOpenRemoveDialog` (предотвращает новую функцию при каждом рендере во время layout FLIP).
- **`MoveGrid`** — `motion.div` entrance animation (`cardVariants`) на каждой карточке.
- **`ProgressStatusPicker`** — восстановлен комментарий про null-status pill behavior.
- **`src/test-setup.ts`** — framer-motion mock расширен: добавлены `variants`, `layout`, `whileHover`, `whileTap`, `onAnimationStart`, `onAnimationComplete` в список stripped props.

### Profile overview layout fixes

- **`getProfileOverviewAction`** — убран `take` лимит на `currentlyLearning` (молча обрезал список).
- **`ProfileCurrentlyLearning`** — root: `min-h-0 flex-col overflow-hidden`; header: `shrink-0`; list: `flex min-h-0 flex-1 overflow-y-auto` — скроллируется внутри карточки не раздувая grid row.
- **`ProfileFavouritesPreview`** — `flex-1` на root — растягивается по высоте правой колонки через flexbox.

### Sticky sidebar

- **`PageShell`** — aside: `self-start sticky top-[60px] h-[calc(100vh-120px)] overflow-y-auto`. Ключевой insight: CSS grid по умолчанию растягивает items (`align-self: stretch`), делая sticky бесполезным (элемент = высота контейнера). `self-start` фиксирует это.

### Итог

406 тестов, все зелёные. Typecheck чистый.
