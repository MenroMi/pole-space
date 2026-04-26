# Step Timestamps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace `steps String[]` with `stepsData Json` and add clickable YouTube timestamp badges to breakdown steps that seek the video to that moment.

**Architecture:** A new `MovePlayer` client wrapper holds `seekTo: number | null` state and passes it to `MoveHero` (which reloads the iframe `src` with `?start=<seconds>`) and `onSeek` to `MoveTabs → MoveBreakdown`. The page RSC renders static content (title, specs, description) as `children` passed into `MovePlayer`, following the RSC-children-into-client-component pattern.

**Tech Stack:** Next.js 15 App Router, Prisma 7 (PostgreSQL/JSONB), Vitest + React Testing Library, Tailwind v4, TypeScript, lucide-react.

---

## File Map

| Action | Path                                                   |
| ------ | ------------------------------------------------------ |
| Modify | `prisma/schema.prisma`                                 |
| Modify | `src/features/moves/types.ts`                          |
| Modify | `src/features/moves/actions.ts`                        |
| Modify | `src/features/moves/actions.test.ts`                   |
| Modify | `src/features/moves/components/MoveBreakdown.tsx`      |
| Modify | `src/features/moves/components/MoveBreakdown.test.tsx` |
| Modify | `src/features/moves/components/MoveTabs.tsx`           |
| Modify | `src/features/moves/components/MoveTabs.test.tsx`      |
| Modify | `src/features/moves/components/MoveHero.tsx`           |
| Create | `src/features/moves/components/MovePlayer.tsx`         |
| Create | `src/features/moves/components/MovePlayer.test.tsx`    |
| Modify | `src/features/moves/index.ts`                          |
| Modify | `src/app/(main)/moves/[id]/page.tsx`                   |
| Modify | `src/features/catalog/components/MoveCard.test.tsx`    |
| Modify | `src/features/catalog/components/MoveGrid.test.tsx`    |
| Modify | `prisma/seed-move-detail.ts`                           |

---

### Task 1: Schema migration

**Files:**

- Modify: `prisma/schema.prisma`

- [x] **Step 1: Update schema.prisma**

Replace `steps String[] @default([])` with `stepsData Json @default("[]")` in the `Move` model:

```prisma
model Move {
  id          String     @id @default(cuid())
  title       String
  description String?
  difficulty  Difficulty
  category    Category
  poleType    PoleType?
  youtubeUrl  String
  imageUrl    String?
  stepsData   Json       @default("[]")
  gripType    String?
  entry       String?
  duration    String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  progress   UserProgress[]
  favourites UserFavourite[]
  tags       Tag[]
}
```

- [x] **Step 2: Run migration**

Working directory: `pole-dance-catalog/.worktrees/move-detail`

```bash
npx prisma migrate dev --name replace_steps_with_steps_data
```

Expected output: `The following migration(s) have been applied: .../replace_steps_with_steps_data/migration.sql`

Note: This drops the `steps` column and adds `stepsData JSONB NOT NULL DEFAULT '[]'`. Existing `steps` data is lost — the seed script (Task 9) will repopulate.

- [x] **Step 3: Verify Prisma client was regenerated**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [x] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: replace steps String[] with stepsData Json in Move schema"
```

---

### Task 2: Types and actions

**Files:**

- Modify: `src/features/moves/types.ts`
- Modify: `src/features/moves/actions.ts`
- Modify: `src/features/moves/actions.test.ts`

- [x] **Step 1: Write the failing test for stepsData**

Open `src/features/moves/actions.test.ts`. The mock currently returns `{ id: 'move-1', title: 'Test Move', tags: [] }`. Add a test that verifies `stepsData` is returned as a typed array:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    move: { findUnique: vi.fn() },
    userFavourite: { findMany: vi.fn() },
  },
}));

import { prisma } from '@/shared/lib/prisma';
import { getMoveByIdAction } from './actions';

const mockFindUnique = prisma.move.findUnique as ReturnType<typeof vi.fn>;
const mockFavouriteFindMany = prisma.userFavourite.findMany as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('getMoveByIdAction', () => {
  const move = {
    id: 'move-1',
    title: 'Test Move',
    tags: [],
    stepsData: [{ text: 'Grip the pole', timestamp: 10 }],
  };

  it('returns null when move is not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await getMoveByIdAction('move-1', 'user-1');
    expect(result).toBeNull();
    expect(mockFavouriteFindMany).not.toHaveBeenCalled();
  });

  it('returns move with favourites when userId provided', async () => {
    mockFindUnique.mockResolvedValue(move);
    mockFavouriteFindMany.mockResolvedValue([{ id: 'fav-1', userId: 'user-1', moveId: 'move-1' }]);
    const result = await getMoveByIdAction('move-1', 'user-1');
    expect(mockFavouriteFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', moveId: 'move-1' },
    });
    expect(result?.favourites).toHaveLength(1);
  });

  it('returns move with empty favourites array when no userId', async () => {
    mockFindUnique.mockResolvedValue(move);
    const result = await getMoveByIdAction('move-1');
    expect(mockFavouriteFindMany).not.toHaveBeenCalled();
    expect(result?.favourites).toEqual([]);
  });

  it('returns stepsData as StepItem array', async () => {
    mockFindUnique.mockResolvedValue(move);
    const result = await getMoveByIdAction('move-1');
    expect(result?.stepsData).toEqual([{ text: 'Grip the pole', timestamp: 10 }]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/features/moves/actions.test.ts
```

Expected: FAIL — `stepsData` not returned or wrongly typed.

- [x] **Step 3: Update types.ts**

```ts
import type { Move, Tag, UserFavourite } from '@prisma/client';

export type StepItem = { text: string; timestamp?: number };

export type MoveDetail = Omit<Move, 'stepsData'> & {
  tags: Tag[];
  favourites: UserFavourite[];
  stepsData: StepItem[];
};
```

- [x] **Step 4: Update actions.ts**

```ts
'use server';
import { prisma } from '@/shared/lib/prisma';

import type { MoveDetail, StepItem } from './types';

export async function getMoveByIdAction(id: string, userId?: string): Promise<MoveDetail | null> {
  const move = await prisma.move.findUnique({
    where: { id },
    include: { tags: true },
  });

  if (!move) return null;

  const favourites = userId
    ? await prisma.userFavourite.findMany({ where: { userId, moveId: id } })
    : [];

  return { ...move, favourites, stepsData: move.stepsData as StepItem[] };
}
```

- [x] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/features/moves/actions.test.ts
```

Expected: PASS — 4 tests.

- [x] **Step 6: Commit**

```bash
git add src/features/moves/types.ts src/features/moves/actions.ts src/features/moves/actions.test.ts
git commit -m "feat: add StepItem type and update getMoveByIdAction to return stepsData"
```

---

### Task 3: Fix broken catalog test fixtures

**Files:**

- Modify: `src/features/catalog/components/MoveCard.test.tsx`
- Modify: `src/features/catalog/components/MoveGrid.test.tsx`

After the schema change, `Move` from Prisma has `stepsData: Prisma.JsonValue` instead of `steps: string[]`. The catalog fixtures must be updated.

- [x] **Step 1: Run catalog tests to see they fail**

```bash
npx vitest run src/features/catalog
```

Expected: TypeScript errors — `steps` does not exist on type `Move`.

- [x] **Step 2: Fix MoveCard.test.tsx**

In the `baseMove` fixture, replace `steps: []` with `stepsData: []`:

```ts
const baseMove: MoveWithTags = {
  id: 'move-1',
  title: 'Jade Split',
  description: 'A beautiful aerial move requiring flexibility.',
  difficulty: 'BEGINNER',
  category: 'SPINS',
  poleType: null,
  youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  imageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
  stepsData: [],
  gripType: null,
  entry: null,
  duration: null,
};
```

- [x] **Step 3: Fix MoveGrid.test.tsx**

In the `makeMoves` factory and the inline fixture inside `resolveLoad`, replace `steps: []` with `stepsData: []`:

```ts
function makeMoves(count: number, offset = 0): MoveWithTags[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `move-${offset + i}`,
    title: `Move ${offset + i}`,
    description: null,
    difficulty: 'BEGINNER' as const,
    category: 'SPINS' as const,
    poleType: null,
    youtubeUrl: '',
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
    stepsData: [],
    gripType: null,
    entry: null,
    duration: null,
  }));
}
```

Also update the inline object inside `resolveLoad` in the unmount test:

```ts
resolveLoad({
  items: [
    {
      id: 'm12',
      title: 'Late',
      description: null,
      difficulty: 'BEGINNER',
      category: 'SPINS',
      poleType: null,
      youtubeUrl: '',
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      stepsData: [],
      gripType: null,
      entry: null,
      duration: null,
    },
  ],
  total: 13,
  page: 2,
  pageSize: 12,
});
```

- [x] **Step 4: Run catalog tests**

```bash
npx vitest run src/features/catalog
```

Expected: PASS — all catalog tests green.

- [x] **Step 5: Commit**

```bash
git add src/features/catalog/components/MoveCard.test.tsx src/features/catalog/components/MoveGrid.test.tsx
git commit -m "fix: update catalog test fixtures steps→stepsData after schema migration"
```

---

### Task 4: MoveBreakdown — Client component with timestamps

**Files:**

- Modify: `src/features/moves/components/MoveBreakdown.tsx`
- Modify: `src/features/moves/components/MoveBreakdown.test.tsx`

- [x] **Step 1: Write the failing tests**

Replace `src/features/moves/components/MoveBreakdown.test.tsx` entirely:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { StepItem } from '../types';

import MoveBreakdown from './MoveBreakdown';

const noop = () => {};

describe('MoveBreakdown', () => {
  it('renders nothing when stepsData is empty', () => {
    const { container } = render(<MoveBreakdown stepsData={[]} onSeek={noop} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the correct number of steps', () => {
    const stepsData: StepItem[] = [
      { text: 'Grip the pole' },
      { text: 'Kick out' },
      { text: 'Extend' },
    ];
    render(<MoveBreakdown stepsData={stepsData} onSeek={noop} />);
    expect(screen.getByText('Grip the pole')).toBeInTheDocument();
    expect(screen.getByText('Kick out')).toBeInTheDocument();
    expect(screen.getByText('Extend')).toBeInTheDocument();
  });

  it('renders step numbers padded to two digits', () => {
    render(<MoveBreakdown stepsData={[{ text: 'First step' }]} onSeek={noop} />);
    expect(screen.getByText('01')).toBeInTheDocument();
  });

  it('renders timestamp badge for steps with a timestamp', () => {
    const stepsData: StepItem[] = [{ text: 'Kick out', timestamp: 45 }];
    render(<MoveBreakdown stepsData={stepsData} onSeek={noop} />);
    expect(screen.getByRole('button', { name: 'Seek to 0:45' })).toBeInTheDocument();
    expect(screen.getByText('0:45')).toBeInTheDocument();
  });

  it('does not render timestamp badge for steps without a timestamp', () => {
    const stepsData: StepItem[] = [{ text: 'Grip the pole' }];
    render(<MoveBreakdown stepsData={stepsData} onSeek={noop} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('formats timestamp correctly for minutes and seconds', () => {
    const stepsData: StepItem[] = [{ text: 'Step', timestamp: 90 }];
    render(<MoveBreakdown stepsData={stepsData} onSeek={noop} />);
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });

  it('calls onSeek with the correct seconds when badge is clicked', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    const stepsData: StepItem[] = [{ text: 'Kick out', timestamp: 45 }];
    render(<MoveBreakdown stepsData={stepsData} onSeek={onSeek} />);
    await user.click(screen.getByRole('button', { name: 'Seek to 0:45' }));
    expect(onSeek).toHaveBeenCalledWith(45);
    expect(onSeek).toHaveBeenCalledTimes(1);
  });

  it('does not call onSeek when clicking a step without a timestamp', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    const stepsData: StepItem[] = [{ text: 'Grip the pole' }];
    render(<MoveBreakdown stepsData={stepsData} onSeek={onSeek} />);
    // No button rendered — confirm no interaction possible
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(onSeek).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/features/moves/components/MoveBreakdown.test.tsx
```

Expected: FAIL — `MoveBreakdown` does not accept `stepsData` or `onSeek` props.

- [x] **Step 3: Implement MoveBreakdown**

Replace `src/features/moves/components/MoveBreakdown.tsx` entirely:

```tsx
'use client';
import { Play } from 'lucide-react';

import type { StepItem } from '../types';

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MoveBreakdown({
  stepsData,
  onSeek,
}: {
  stepsData: StepItem[];
  onSeek: (seconds: number) => void;
}) {
  if (stepsData.length === 0) return null;

  return (
    <div className="bg-surface-container-low rounded-xl p-8">
      <div className="space-y-6">
        {stepsData.map((step, index) => (
          // stable display-only list — index key is safe
          <div
            key={index}
            className="group hover:bg-surface-container-highest -mx-4 flex gap-6 rounded-lg p-4 transition-colors"
          >
            <div className="shrink-0 font-display text-4xl font-bold text-outline-variant opacity-50 transition-colors group-hover:text-primary group-hover:opacity-100">
              {String(index + 1).padStart(2, '0')}
            </div>
            <div className="flex flex-1 items-center justify-between gap-4">
              <p className="font-sans leading-relaxed text-on-surface">{step.text}</p>
              {step.timestamp != null && (
                <button
                  type="button"
                  onClick={() => onSeek(step.timestamp!)}
                  aria-label={`Seek to ${formatTimestamp(step.timestamp)}`}
                  className="flex shrink-0 items-center gap-1 rounded px-2 py-1 font-sans text-xs text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                >
                  <Play size={10} fill="currentColor" aria-hidden="true" />
                  {formatTimestamp(step.timestamp)}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/features/moves/components/MoveBreakdown.test.tsx
```

Expected: PASS — 8 tests.

- [x] **Step 5: Commit**

```bash
git add src/features/moves/components/MoveBreakdown.tsx src/features/moves/components/MoveBreakdown.test.tsx
git commit -m "feat: MoveBreakdown accepts stepsData with clickable timestamp badges"
```

---

### Task 5: MoveTabs — stepsData and onSeek

**Files:**

- Modify: `src/features/moves/components/MoveTabs.tsx`
- Modify: `src/features/moves/components/MoveTabs.test.tsx`

- [x] **Step 1: Update MoveTabs.test.tsx**

Replace `steps` with `stepsData` throughout. The `onSeek` prop can be a no-op in these tests since the tab-switching behaviour is what's being tested:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoveTabs from './MoveTabs';

const noop = () => {};

describe('MoveTabs', () => {
  it('renders three tab buttons', () => {
    render(<MoveTabs stepsData={[]} onSeek={noop} />);
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Muscles' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Safety' })).toBeInTheDocument();
  });

  it('shows Breakdown tab content by default', () => {
    render(<MoveTabs stepsData={[{ text: 'Step one' }]} onSeek={noop} />);
    expect(screen.getByText('Step one')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Muscles' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Safety' })).toHaveAttribute('aria-selected', 'false');
  });

  it('switches to Muscles coming soon on click', async () => {
    const user = userEvent.setup();
    render(<MoveTabs stepsData={[]} onSeek={noop} />);
    await user.click(screen.getByRole('tab', { name: 'Muscles' }));
    expect(screen.getAllByText('Coming soon')).toHaveLength(1);
    expect(screen.getByRole('tab', { name: 'Muscles' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('switches to Safety coming soon on click', async () => {
    const user = userEvent.setup();
    render(<MoveTabs stepsData={[]} onSeek={noop} />);
    await user.click(screen.getByRole('tab', { name: 'Safety' }));
    expect(screen.getAllByText('Coming soon')).toHaveLength(1);
    expect(screen.getByRole('tab', { name: 'Safety' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('renders the tabpanel even when stepsData is empty', () => {
    render(<MoveTabs stepsData={[]} onSeek={noop} />);
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/features/moves/components/MoveTabs.test.tsx
```

Expected: FAIL — `MoveTabs` does not accept `stepsData` or `onSeek`.

- [x] **Step 3: Update MoveTabs.tsx**

Replace the component prop types and MoveBreakdown usage:

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';

import type { StepItem } from '../types';

import MoveBreakdown from './MoveBreakdown';

type Tab = 'breakdown' | 'muscles' | 'safety';

const TABS: { id: Tab; label: string }[] = [
  { id: 'breakdown', label: 'Breakdown' },
  { id: 'muscles', label: 'Muscles' },
  { id: 'safety', label: 'Safety' },
];

export default function MoveTabs({
  stepsData,
  onSeek,
}: {
  stepsData: StepItem[];
  onSeek: (seconds: number) => void;
}) {
  const [active, setActive] = useState<Tab>('breakdown');
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const activeIndex = TABS.findIndex((t) => t.id === active);
    const el = tabRefs.current[activeIndex];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active]);

  return (
    <div>
      <div
        role="tablist"
        className="relative mb-8 flex gap-8 border-b border-outline-variant/15 pb-4"
      >
        {TABS.map(({ id, label }, i) => (
          <button
            key={id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            id={`tab-${id}`}
            role="tab"
            aria-selected={active === id}
            aria-controls="move-tabpanel"
            tabIndex={active === id ? 0 : -1}
            onClick={() => setActive(id)}
            className={`font-display text-lg tracking-wide uppercase transition-colors duration-200 ${
              active === id ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {label}
          </button>
        ))}

        {/* sliding indicator */}
        <span
          aria-hidden="true"
          className="absolute -bottom-[1px] h-[2px] bg-gradient-to-r from-primary to-primary-container transition-all duration-300 ease-in-out"
          style={{ left: indicator.left, width: indicator.width }}
        />
      </div>

      <div id="move-tabpanel" role="tabpanel" aria-labelledby={`tab-${active}`} tabIndex={0}>
        <div key={active} className="animate-in duration-200 fade-in-0 slide-in-from-bottom-2">
          {active === 'breakdown' && <MoveBreakdown stepsData={stepsData} onSeek={onSeek} />}
          {(active === 'muscles' || active === 'safety') && (
            <p className="py-12 text-center font-display text-xs font-bold tracking-[0.3em] text-on-surface-variant uppercase">
              Coming soon
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/features/moves/components/MoveTabs.test.tsx
```

Expected: PASS — 5 tests.

- [x] **Step 5: Commit**

```bash
git add src/features/moves/components/MoveTabs.tsx src/features/moves/components/MoveTabs.test.tsx
git commit -m "feat: MoveTabs accepts stepsData and onSeek, passes them to MoveBreakdown"
```

---

### Task 6: MoveHero — seekTo prop

**Files:**

- Modify: `src/features/moves/components/MoveHero.tsx`

No new tests for MoveHero (integration is tested via MovePlayer in Task 7). This task is implement-only.

- [x] **Step 1: Update MoveHero.tsx**

Add `seekTo?: number` prop, `startAt` state, `phaseRef`, and the seek `useEffect`:

```tsx
'use client';
import { Play } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'transitioning' | 'playing';

type MoveHeroProps = {
  title: string;
  youtubeUrl: string;
  imageUrl: string | null;
  seekTo?: number;
};

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function MoveHero({ title, youtubeUrl, imageUrl, seekTo }: MoveHeroProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [startAt, setStartAt] = useState<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const videoId = extractVideoId(youtubeUrl);
  const thumbnail =
    imageUrl ?? (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

  // Keep phaseRef in sync so the seekTo effect always reads current phase
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Handle seek requests
  useEffect(() => {
    if (seekTo == null || !videoId) return;
    const currentPhase = phaseRef.current;
    if (currentPhase === 'playing') {
      setStartAt(seekTo);
    } else if (currentPhase === 'idle') {
      setStartAt(seekTo);
      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        setPhase('playing');
      } else {
        setPhase('transitioning');
        timeoutRef.current = setTimeout(() => setPhase('playing'), 500);
      }
    }
    // 'transitioning': ignore — animation already in progress
  }, [seekTo, videoId]);

  function handlePlay() {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setPhase('playing');
    } else {
      setPhase('transitioning');
      timeoutRef.current = setTimeout(() => setPhase('playing'), 500);
    }
  }

  const iframeSrc = `https://www.youtube.com/embed/${videoId}?autoplay=1${startAt != null ? `&start=${startAt}` : ''}`;

  return (
    <div className="relative h-[65vh] w-full overflow-hidden bg-black">
      {/* Thumbnail — visible in idle, zooms+blurs+fades during transitioning */}
      {phase !== 'playing' &&
        (thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            priority
            className={`object-cover transition-all duration-500 ${
              phase === 'transitioning'
                ? 'scale-110 opacity-0 blur-sm'
                : 'scale-100 opacity-80 blur-none'
            }`}
          />
        ) : (
          <div className="absolute inset-0 bg-surface-container" />
        ))}

      {/* iframe — mounts during transitioning (opacity-0), fades in, stays for playing */}
      {phase !== 'idle' && videoId && (
        <iframe
          src={iframeSrc}
          title={title}
          className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-500 ${
            phase === 'transitioning' ? 'opacity-0' : 'opacity-100'
          }`}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      )}

      {/* Play button — visible only in idle */}
      {phase === 'idle' && videoId && (
        <button
          type="button"
          onClick={handlePlay}
          aria-label={`Play ${title}`}
          className="group absolute inset-0 flex items-center justify-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface/70 text-primary shadow-[0_0_32px_rgba(220,184,255,0.06)] backdrop-blur-md transition-transform group-hover:scale-105">
            <Play size={36} fill="currentColor" aria-hidden="true" />
          </div>
        </button>
      )}

      {/* Bottom gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent"
      />
    </div>
  );
}
```

- [x] **Step 2: Run existing tests to confirm no regressions**

```bash
npx vitest run src/features/moves
```

Expected: All existing moves tests still PASS.

- [x] **Step 3: Commit**

```bash
git add src/features/moves/components/MoveHero.tsx
git commit -m "feat: MoveHero accepts seekTo prop and reloads iframe at correct position"
```

---

### Task 7: MovePlayer — new client wrapper

**Files:**

- Create: `src/features/moves/components/MovePlayer.tsx`
- Create: `src/features/moves/components/MovePlayer.test.tsx`

- [x] **Step 1: Write the failing tests**

Create `src/features/moves/components/MovePlayer.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { StepItem } from '../types';

// Mock sub-components so we can observe props without rendering their internals
vi.mock('./MoveHero', () => ({
  default: vi.fn(({ seekTo }: { seekTo?: number }) => (
    <div data-testid="move-hero" data-seek-to={seekTo ?? ''} />
  )),
}));

vi.mock('./MoveTabs', () => ({
  default: vi.fn(({ onSeek }: { onSeek: (s: number) => void }) => (
    <button type="button" onClick={() => onSeek(45)}>
      seek
    </button>
  )),
}));

import MovePlayer from './MovePlayer';

const baseProps = {
  title: 'Fireman Spin',
  youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
  imageUrl: null,
  stepsData: [] as StepItem[],
};

describe('MovePlayer', () => {
  it('renders MoveHero and MoveTabs', () => {
    render(<MovePlayer {...baseProps}>content</MovePlayer>);
    expect(screen.getByTestId('move-hero')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'seek' })).toBeInTheDocument();
  });

  it('renders children between hero and tabs', () => {
    render(
      <MovePlayer {...baseProps}>
        <p>static content</p>
      </MovePlayer>,
    );
    expect(screen.getByText('static content')).toBeInTheDocument();
  });

  it('passes undefined seekTo to MoveHero initially', () => {
    render(<MovePlayer {...baseProps}>content</MovePlayer>);
    expect(screen.getByTestId('move-hero')).toHaveAttribute('data-seek-to', '');
  });

  it('updates seekTo on MoveHero when onSeek is called', async () => {
    const user = userEvent.setup();
    render(<MovePlayer {...baseProps}>content</MovePlayer>);
    await user.click(screen.getByRole('button', { name: 'seek' }));
    expect(screen.getByTestId('move-hero')).toHaveAttribute('data-seek-to', '45');
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/features/moves/components/MovePlayer.test.tsx
```

Expected: FAIL — `MovePlayer` does not exist.

- [x] **Step 3: Create MovePlayer.tsx**

```tsx
'use client';
import { useState } from 'react';

import type { StepItem } from '../types';

import MoveHero from './MoveHero';
import MoveTabs from './MoveTabs';

type MovePlayerProps = {
  title: string;
  youtubeUrl: string;
  imageUrl: string | null;
  stepsData: StepItem[];
  children: React.ReactNode;
};

export default function MovePlayer({
  title,
  youtubeUrl,
  imageUrl,
  stepsData,
  children,
}: MovePlayerProps) {
  const [seekTo, setSeekTo] = useState<number | null>(null);

  return (
    <>
      <MoveHero
        title={title}
        youtubeUrl={youtubeUrl}
        imageUrl={imageUrl}
        seekTo={seekTo ?? undefined}
      />
      <div className="mx-auto max-w-4xl space-y-10 px-6 py-10 md:px-12">
        {children}
        <MoveTabs stepsData={stepsData} onSeek={setSeekTo} />
      </div>
    </>
  );
}
```

- [x] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/features/moves/components/MovePlayer.test.tsx
```

Expected: PASS — 4 tests.

- [x] **Step 5: Commit**

```bash
git add src/features/moves/components/MovePlayer.tsx src/features/moves/components/MovePlayer.test.tsx
git commit -m "feat: add MovePlayer client wrapper that manages seekTo state"
```

---

### Task 8: Wire up page.tsx and index.ts

**Files:**

- Modify: `src/features/moves/index.ts`
- Modify: `src/app/(main)/moves/[id]/page.tsx`

- [x] **Step 1: Update index.ts**

Add `MovePlayer` export. Keep existing exports — `MoveHero` is still valid for future use:

```ts
export { getMoveByIdAction } from './actions';
export type { MoveDetail, StepItem } from './types';
export { default as MoveHero } from './components/MoveHero';
export { default as MovePlayer } from './components/MovePlayer';
export { default as MoveFavouriteButton } from './components/MoveFavouriteButton';
export { default as MoveSpecs } from './components/MoveSpecs';
export { default as MoveTabs } from './components/MoveTabs';
```

- [x] **Step 2: Update page.tsx**

Replace `MoveHero` + `MoveTabs` usage with `MovePlayer`. The static content (title, badges, specs, description) becomes `children` of `MovePlayer`. The `max-w-4xl` container moves into `MovePlayer`:

```tsx
import type { Difficulty } from '@prisma/client';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';

import { getMoveByIdAction, MovePlayer, MoveFavouriteButton, MoveSpecs } from '@/features/moves';
import { auth } from '@/shared/lib/auth';

const DIFFICULTY_BADGE: Record<Difficulty, { className: string; style?: CSSProperties }> = {
  BEGINNER: { className: 'bg-secondary-container text-on-secondary-container' },
  INTERMEDIATE: { className: 'bg-primary-container text-on-surface' },
  ADVANCED: { className: '', style: { backgroundColor: '#92400e', color: '#fef3c7' } },
};

export default async function MoveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  const move = await getMoveByIdAction(id, userId);

  if (!move) notFound();

  const isFavourited = move.favourites.length > 0;
  const isAuthenticated = !!userId;
  const badge = DIFFICULTY_BADGE[move.difficulty];
  const difficultyLabel = move.difficulty.charAt(0) + move.difficulty.slice(1).toLowerCase();
  const poleTypeLabel = move.poleType
    ? move.poleType.charAt(0) + move.poleType.slice(1).toLowerCase()
    : null;

  return (
    <main>
      <MovePlayer
        title={move.title}
        youtubeUrl={move.youtubeUrl}
        imageUrl={move.imageUrl}
        stepsData={move.stepsData}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="mb-4 font-display text-5xl font-bold tracking-tighter text-on-surface lowercase md:text-7xl">
              {move.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              {poleTypeLabel && (
                <span className="rounded-full bg-secondary-container px-4 py-1 font-sans text-[10px] tracking-widest text-on-secondary-container uppercase">
                  {poleTypeLabel}
                </span>
              )}
              <span
                className={`rounded-full px-4 py-1 font-sans text-[10px] tracking-widest uppercase ${badge.className}`}
                style={badge.style}
              >
                {difficultyLabel}
              </span>
            </div>
          </div>
          <MoveFavouriteButton
            moveId={move.id}
            isFavourited={isFavourited}
            isAuthenticated={isAuthenticated}
          />
        </div>

        <MoveSpecs
          gripType={move.gripType}
          entry={move.entry}
          duration={move.duration}
          poleType={move.poleType}
        />

        {move.description && (
          <p className="font-sans text-lg leading-relaxed text-on-surface-variant">
            {move.description}
          </p>
        )}
      </MovePlayer>
    </main>
  );
}
```

- [x] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: PASS — all tests green.

- [x] **Step 4: Commit**

```bash
git add src/features/moves/index.ts src/app/(main)/moves/[id]/page.tsx
git commit -m "feat: wire MovePlayer into move detail page"
```

---

### Task 9: Update seed with timestamps

**Files:**

- Modify: `prisma/seed-move-detail.ts`

- [x] **Step 1: Update seed-move-detail.ts**

Replace `steps: string[]` with `stepsData` using the `StepItem` format. Add realistic timestamps (in seconds) to a few steps in each move:

```ts
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import 'dotenv/config';
import { Pool } from 'pg';

config({ path: '.env.local', override: true });

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type StepItem = { text: string; timestamp?: number };

const updates: {
  title: string;
  gripType: string;
  entry: string;
  duration: string;
  poleType: 'STATIC' | 'SPIN';
  stepsData: StepItem[];
}[] = [
  {
    title: 'Fireman Spin',
    gripType: 'Baseball grip',
    entry: 'Standing, facing pole',
    duration: '2–4 counts',
    poleType: 'SPIN',
    stepsData: [
      {
        text: "Stand sideways to the pole at arm's length, inside shoulder facing it.",
        timestamp: 5,
      },
      {
        text: 'Place your inside hand high on the pole at shoulder height, palm facing away.',
        timestamp: 12,
      },
      { text: 'Place your outside hand just below, creating a wide grip.' },
      {
        text: 'Swing your outside leg forward and use the momentum to lift off the ground.',
        timestamp: 22,
      },
      { text: 'Wrap your inside leg around the pole — this is your anchor.' },
      { text: 'Extend your outside leg straight, toes pointed, body long.', timestamp: 35 },
      { text: 'Hold the shape and enjoy the rotation.' },
      { text: 'Land softly by releasing the leg wrap and stepping down.', timestamp: 48 },
    ],
  },
  {
    title: 'Chair Spin',
    gripType: 'Split grip',
    entry: 'Standing, facing pole',
    duration: '2–4 counts',
    poleType: 'SPIN',
    stepsData: [
      { text: 'Stand facing the pole, feet together.', timestamp: 5 },
      {
        text: 'Place your dominant hand high on the pole, palm facing in. Place your other hand lower, palm out — this is split grip.',
        timestamp: 10,
      },
      { text: 'Swing your outer leg forward to build momentum and jump.', timestamp: 18 },
      { text: "Bring both knees up together as if you're sitting in a chair.", timestamp: 25 },
      { text: 'Cross your ankles, point your toes, and keep your back slightly arched.' },
      { text: 'Keep your elbows soft — squeezing too hard kills the spin.' },
      { text: 'As the spin slows, uncross your legs and step down.', timestamp: 40 },
    ],
  },
  {
    title: 'Carousel Spin',
    gripType: 'Split grip',
    entry: 'Standing, facing pole',
    duration: '4–6 counts',
    poleType: 'SPIN',
    stepsData: [
      {
        text: 'Stand facing the pole. Place your top hand high in split grip, bottom hand at hip height.',
        timestamp: 5,
      },
      {
        text: 'Kick your outer leg to the side and use the momentum to lift both feet off the ground.',
        timestamp: 15,
      },
      { text: 'Let your body fall horizontal — aim to be parallel to the floor.', timestamp: 22 },
      { text: 'Extend both legs away from the pole, heels pressing outward.' },
      { text: 'Engage your core to keep your hips level and body flat.' },
      { text: 'Point your toes and hold the line from head to heel.', timestamp: 38 },
      { text: 'Let the spin slow naturally, then tuck your knees and step down.', timestamp: 50 },
    ],
  },
  {
    title: 'Inside Leg Hang',
    gripType: 'Outside elbow grip',
    entry: 'From climb or standing',
    duration: 'Hold 2–4 counts',
    poleType: 'STATIC',
    stepsData: [
      {
        text: 'Climb to a comfortable height — at least waist level above the floor.',
        timestamp: 8,
      },
      {
        text: 'Bring the pole to the crook of one knee (inside leg), squeezing firmly.',
        timestamp: 18,
      },
      {
        text: 'Wrap the foot of that leg around the pole and point the toe to lock the grip.',
        timestamp: 27,
      },
      { text: 'Engage your core and slowly lower your hands away from the pole.', timestamp: 35 },
      {
        text: 'Let your torso drop back — keep the leg squeeze active the entire time.',
        timestamp: 42,
      },
      { text: 'Extend your free leg long and point both feet.' },
      { text: 'Hold the position, feeling the stretch through your torso.' },
      {
        text: 'To exit, reach back up to the pole with both hands before releasing the leg.',
        timestamp: 60,
      },
    ],
  },
  {
    title: 'Superman',
    gripType: 'Outside elbow grip',
    entry: 'From climb or Pole Sit',
    duration: 'Hold 2–4 counts',
    poleType: 'STATIC',
    stepsData: [
      {
        text: 'From a Pole Sit (thighs crossed around the pole), place one hand high and one hand low.',
        timestamp: 8,
      },
      {
        text: 'Engage the outside elbow against the pole to create a secondary grip point.',
        timestamp: 16,
      },
      { text: 'Slowly lean your body forward and away from the pole.', timestamp: 25 },
      {
        text: 'Extend your top leg long behind you, pressing the heel toward the ceiling.',
        timestamp: 33,
      },
      { text: 'Your bottom leg can hook the pole or extend parallel — choose based on comfort.' },
      { text: 'Release your hands one at a time once you feel stable in the hold.', timestamp: 45 },
      { text: "Stretch your arms forward like you're flying — gaze slightly up." },
      {
        text: 'To exit, reach back to the pole, re-engage your leg grip, and climb down.',
        timestamp: 58,
      },
    ],
  },
  {
    title: 'Basic Climb',
    gripType: 'Standard grip',
    entry: 'Standing, facing pole',
    duration: '2–3 counts per step',
    poleType: 'STATIC',
    stepsData: [
      { text: 'Stand facing the pole, feet hip-width apart.', timestamp: 5 },
      { text: 'Place both hands on the pole above your head, thumbs down.', timestamp: 10 },
      {
        text: 'Jump and wrap your dominant (inside) leg around the pole at the knee.',
        timestamp: 17,
      },
      { text: 'Squeeze the pole between your inner knee and the top of your foot.', timestamp: 25 },
      { text: 'Use your hands to pull up while your feet push against the pole.', timestamp: 32 },
      { text: 'Move your lower leg grip up, then hands — alternate in a crawling motion.' },
      { text: 'Keep your elbows bent and core engaged throughout.' },
      { text: 'To descend, reverse the motion slowly — never slide uncontrolled.', timestamp: 55 },
    ],
  },
];

async function main() {
  console.log(`Updating ${updates.length} moves with stepsData and detail fields...`);

  let updated = 0;
  let notFound = 0;

  for (const { title, ...data } of updates) {
    const move = await prisma.move.findFirst({ where: { title } });
    if (!move) {
      console.log(`  ⚠️  Not found: "${title}" — skipping`);
      notFound++;
      continue;
    }
    await prisma.move.update({ where: { id: move.id }, data });
    console.log(`  ✓  Updated: "${title}"`);
    updated++;
  }

  console.log(`\nDone. ${updated} updated, ${notFound} not found.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [x] **Step 2: Commit**

```bash
git add prisma/seed-move-detail.ts
git commit -m "chore: update seed to use stepsData with sample timestamps"
```

- [x] **Step 3: Run seed (optional — populates dev DB)**

This command runs `seed-move-detail.ts` via `tsx`:

```bash
npx tsx prisma/seed-move-detail.ts
```

Expected output: `✓ Updated: "Fireman Spin"` × 6, `Done. 6 updated, 0 not found.`
