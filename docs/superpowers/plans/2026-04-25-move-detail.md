# Move Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build a full `/moves/[id]` detail page with cinematic video hero, specs grid, description, tabbed breakdown, and optimistic favourite toggle.

**Architecture:** RSC page fetches move + session in parallel; two Client islands handle interactivity (`MoveHero` for zoom+fade video animation, `MoveFavouriteButton` for optimistic favourite). All other components are server-rendered. TDD throughout.

**Tech Stack:** Next.js App Router, Prisma 7, Vitest + Testing Library, Tailwind v4, Lucide icons, `next/image`, `useOptimistic`, `useTransition`.

---

## File Map

| Action | Path                                                         |
| ------ | ------------------------------------------------------------ |
| Modify | `prisma/schema.prisma`                                       |
| Modify | `src/features/moves/actions.ts`                              |
| Modify | `src/features/moves/types.ts`                                |
| Modify | `src/features/moves/index.ts`                                |
| Modify | `src/features/profile/actions.ts`                            |
| Modify | `src/features/profile/actions.test.ts`                       |
| Create | `src/features/moves/actions.test.ts`                         |
| Create | `src/features/moves/components/MoveBreakdown.tsx`            |
| Create | `src/features/moves/components/MoveBreakdown.test.tsx`       |
| Create | `src/features/moves/components/MoveSpecs.tsx`                |
| Create | `src/features/moves/components/MoveSpecs.test.tsx`           |
| Create | `src/features/moves/components/MoveTabs.tsx`                 |
| Create | `src/features/moves/components/MoveTabs.test.tsx`            |
| Create | `src/features/moves/components/MoveHero.tsx`                 |
| Create | `src/features/moves/components/MoveFavouriteButton.tsx`      |
| Create | `src/features/moves/components/MoveFavouriteButton.test.tsx` |
| Modify | `src/app/(main)/moves/[id]/page.tsx`                         |

---

### Task 1: Schema migration

**Files:**

- Modify: `prisma/schema.prisma`

- [x] **Step 1: Add fields to Move model**

In `prisma/schema.prisma`, replace the `Move` model with:

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
  steps       String[]  @default([])
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

```bash
cd .worktrees/move-detail && npx prisma migrate dev --name add_move_detail_fields
```

Expected output: `Your database is now in sync with your schema.`

- [x] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add steps, gripType, entry, duration to Move"
```

---

### Task 2: Update MoveDetail type + getMoveByIdAction

**Files:**

- Modify: `src/features/moves/types.ts`
- Modify: `src/features/moves/actions.ts`
- Create: `src/features/moves/actions.test.ts`

- [x] **Step 1: Write failing tests**

Create `src/features/moves/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    move: { findUnique: vi.fn() },
    userFavourite: { findMany: vi.fn() },
  },
}));

vi.mock('@/shared/lib/auth', () => ({
  auth: vi.fn(),
}));

import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';
import { getMoveByIdAction } from './actions';

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.move.findUnique as ReturnType<typeof vi.fn>;
const mockFavouriteFindMany = prisma.userFavourite.findMany as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('getMoveByIdAction', () => {
  const session = { user: { id: 'user-1' } };
  const move = { id: 'move-1', title: 'Test Move', tags: [] };

  it('returns null when move is not found', async () => {
    mockAuth.mockResolvedValue(session);
    mockFindUnique.mockResolvedValue(null);
    const result = await getMoveByIdAction('move-1');
    expect(result).toBeNull();
    expect(mockFavouriteFindMany).not.toHaveBeenCalled();
  });

  it('returns move with favourites when authenticated', async () => {
    mockAuth.mockResolvedValue(session);
    mockFindUnique.mockResolvedValue(move);
    mockFavouriteFindMany.mockResolvedValue([{ id: 'fav-1', userId: 'user-1', moveId: 'move-1' }]);
    const result = await getMoveByIdAction('move-1');
    expect(mockFavouriteFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', moveId: 'move-1' },
    });
    expect(result?.favourites).toHaveLength(1);
  });

  it('returns move with empty favourites array when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue(move);
    const result = await getMoveByIdAction('move-1');
    expect(mockFavouriteFindMany).not.toHaveBeenCalled();
    expect(result?.favourites).toEqual([]);
  });
});
```

- [x] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/features/moves/actions.test.ts
```

Expected: FAIL — `getMoveByIdAction` doesn't match new behaviour yet.

- [x] **Step 3: Update MoveDetail type**

Replace `src/features/moves/types.ts`:

```ts
import type { Move, Tag, UserFavourite } from '@prisma/client';

export type MoveDetail = Move & { tags: Tag[]; favourites: UserFavourite[] };
```

- [x] **Step 4: Update getMoveByIdAction**

Replace `src/features/moves/actions.ts`:

```ts
'use server';
import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

import type { MoveDetail } from './types';

export async function getMoveByIdAction(id: string): Promise<MoveDetail | null> {
  const session = await auth();
  const userId = session?.user?.id;

  const move = await prisma.move.findUnique({
    where: { id },
    include: { tags: true },
  });

  if (!move) return null;

  const favourites = userId
    ? await prisma.userFavourite.findMany({ where: { userId, moveId: id } })
    : [];

  return { ...move, favourites };
}
```

- [x] **Step 5: Run tests — verify they pass**

```bash
npx vitest run src/features/moves/actions.test.ts
```

Expected: PASS (3 tests).

- [x] **Step 6: Commit**

```bash
git add src/features/moves/actions.ts src/features/moves/actions.test.ts src/features/moves/types.ts
git commit -m "feat(moves): update getMoveByIdAction with auth + favourites"
```

---

### Task 3: Add revalidatePath('/moves/[id]') to favourite actions

**Files:**

- Modify: `src/features/profile/actions.ts`
- Modify: `src/features/profile/actions.test.ts`

- [x] **Step 1: Add assertions to existing tests**

In `src/features/profile/actions.test.ts`, find the `addFavouriteAction` describe block and add one assertion:

```ts
// In 'upserts favourite and returns success' test — add after existing revalidatePath assertions:
expect(mockRevalidatePath).toHaveBeenCalledWith('/moves/move-1');
```

And in the `removeFavouriteAction` describe block, in the 'deletes favourite and returns success' test:

```ts
// Add after existing revalidatePath assertions:
expect(mockRevalidatePath).toHaveBeenCalledWith('/moves/move-1');
```

- [x] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/features/profile/actions.test.ts
```

Expected: FAIL — `revalidatePath('/moves/move-1')` not called yet.

- [x] **Step 3: Add revalidatePath calls to profile/actions.ts**

In `src/features/profile/actions.ts`, update `addFavouriteAction`:

```ts
export async function addFavouriteAction(moveId: string) {
  const userId = await requireAuth();
  await prisma.userFavourite.upsert({
    where: { userId_moveId: { userId, moveId } },
    create: { userId, moveId },
    update: {},
  });
  revalidatePath('/profile/favourite-moves');
  revalidatePath('/profile');
  revalidatePath('/moves/' + moveId);
  return { success: true as const };
}
```

And `removeFavouriteAction`:

```ts
export async function removeFavouriteAction(moveId: string) {
  const userId = await requireAuth();
  await prisma.userFavourite.deleteMany({
    where: { userId, moveId },
  });
  revalidatePath('/profile/favourite-moves');
  revalidatePath('/profile');
  revalidatePath('/moves/' + moveId);
  return { success: true as const };
}
```

- [x] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/features/profile/actions.test.ts
```

Expected: PASS (all existing tests still green).

- [x] **Step 5: Commit**

```bash
git add src/features/profile/actions.ts src/features/profile/actions.test.ts
git commit -m "feat(profile): revalidate move detail path on favourite toggle"
```

---

### Task 4: MoveBreakdown component

**Files:**

- Create: `src/features/moves/components/MoveBreakdown.tsx`
- Create: `src/features/moves/components/MoveBreakdown.test.tsx`

- [x] **Step 1: Write failing tests**

Create `src/features/moves/components/MoveBreakdown.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MoveBreakdown from './MoveBreakdown';

describe('MoveBreakdown', () => {
  it('renders nothing when steps is empty', () => {
    const { container } = render(<MoveBreakdown steps={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the correct number of steps', () => {
    render(<MoveBreakdown steps={['Grip the pole', 'Kick out', 'Extend']} />);
    expect(screen.getByText('Grip the pole')).toBeInTheDocument();
    expect(screen.getByText('Kick out')).toBeInTheDocument();
    expect(screen.getByText('Extend')).toBeInTheDocument();
  });

  it('renders step numbers padded to two digits', () => {
    render(<MoveBreakdown steps={['First step']} />);
    expect(screen.getByText('01')).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/features/moves/components/MoveBreakdown.test.tsx
```

Expected: FAIL — component does not exist.

- [x] **Step 3: Create MoveBreakdown**

Create `src/features/moves/components/MoveBreakdown.tsx`:

```tsx
export default function MoveBreakdown({ steps }: { steps: string[] }) {
  if (steps.length === 0) return null;

  return (
    <div className="bg-surface-container-low rounded-xl p-8">
      <h3 className="mb-6 font-display text-xl text-primary">Breakdown</h3>
      <div className="space-y-6">
        {steps.map((step, index) => (
          <div
            key={index}
            className="group hover:bg-surface-container-highest -mx-4 flex gap-6 rounded-lg p-4 transition-colors"
          >
            <div className="shrink-0 font-display text-4xl font-bold text-outline-variant opacity-50 transition-colors group-hover:text-primary group-hover:opacity-100">
              {String(index + 1).padStart(2, '0')}
            </div>
            <p className="font-sans leading-relaxed text-on-surface">{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/features/moves/components/MoveBreakdown.test.tsx
```

Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add src/features/moves/components/MoveBreakdown.tsx src/features/moves/components/MoveBreakdown.test.tsx
git commit -m "feat(moves): add MoveBreakdown component"
```

---

### Task 5: MoveSpecs component

**Files:**

- Create: `src/features/moves/components/MoveSpecs.tsx`
- Create: `src/features/moves/components/MoveSpecs.test.tsx`

- [x] **Step 1: Write failing tests**

Create `src/features/moves/components/MoveSpecs.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MoveSpecs from './MoveSpecs';

describe('MoveSpecs', () => {
  it('renders nothing when all fields are null', () => {
    const { container } = render(
      <MoveSpecs gripType={null} entry={null} duration={null} poleType={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders only non-null fields', () => {
    render(<MoveSpecs gripType="Twisted" entry={null} duration="Short" poleType={null} />);
    expect(screen.getByText('Twisted')).toBeInTheDocument();
    expect(screen.getByText('Short')).toBeInTheDocument();
    expect(screen.queryByText('Entry')).not.toBeInTheDocument();
  });

  it('renders poleType as capitalized label (SPIN → Spin)', () => {
    render(<MoveSpecs gripType={null} entry={null} duration={null} poleType="SPIN" />);
    expect(screen.getByText('Spin')).toBeInTheDocument();
    expect(screen.getByText('Pole Setting')).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/features/moves/components/MoveSpecs.test.tsx
```

Expected: FAIL — component does not exist.

- [x] **Step 3: Create MoveSpecs**

Create `src/features/moves/components/MoveSpecs.tsx`:

```tsx
import type { Move } from '@prisma/client';

type MoveSpecsProps = Pick<Move, 'gripType' | 'entry' | 'duration' | 'poleType'>;
type SpecItem = { label: string; value: string };

function SpecCard({ label, value }: SpecItem) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-outline-variant/15 bg-surface-container-lowest p-6">
      <span className="font-sans text-[10px] tracking-widest text-on-surface-variant uppercase">
        {label}
      </span>
      <span className="font-display text-lg text-on-surface">{value}</span>
    </div>
  );
}

export default function MoveSpecs({ gripType, entry, duration, poleType }: MoveSpecsProps) {
  const specs: SpecItem[] = (
    [
      { label: 'Grip Type', value: gripType },
      { label: 'Entry', value: entry },
      { label: 'Duration', value: duration },
      {
        label: 'Pole Setting',
        value: poleType ? poleType.charAt(0) + poleType.slice(1).toLowerCase() : null,
      },
    ] as { label: string; value: string | null | undefined }[]
  ).filter((s): s is SpecItem => s.value != null);

  if (specs.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {specs.map(({ label, value }) => (
        <SpecCard key={label} label={label} value={value} />
      ))}
    </div>
  );
}
```

- [x] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/features/moves/components/MoveSpecs.test.tsx
```

Expected: PASS (3 tests).

- [x] **Step 5: Commit**

```bash
git add src/features/moves/components/MoveSpecs.tsx src/features/moves/components/MoveSpecs.test.tsx
git commit -m "feat(moves): add MoveSpecs component"
```

---

### Task 6: MoveTabs component

**Files:**

- Create: `src/features/moves/components/MoveTabs.tsx`
- Create: `src/features/moves/components/MoveTabs.test.tsx`

- [x] **Step 1: Write failing tests**

Create `src/features/moves/components/MoveTabs.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoveTabs from './MoveTabs';

describe('MoveTabs', () => {
  it('renders three tab buttons', () => {
    render(<MoveTabs steps={[]} />);
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Muscles' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Safety' })).toBeInTheDocument();
  });

  it('shows Breakdown tab content by default', () => {
    render(<MoveTabs steps={['Step one']} />);
    expect(screen.getByText('Step one')).toBeInTheDocument();
  });

  it('switches to Muscles coming soon on click', async () => {
    const user = userEvent.setup();
    render(<MoveTabs steps={[]} />);
    await user.click(screen.getByRole('tab', { name: 'Muscles' }));
    expect(screen.getAllByText('Coming soon')).toHaveLength(1);
  });

  it('switches to Safety coming soon on click', async () => {
    const user = userEvent.setup();
    render(<MoveTabs steps={[]} />);
    await user.click(screen.getByRole('tab', { name: 'Safety' }));
    expect(screen.getAllByText('Coming soon')).toHaveLength(1);
  });
});
```

- [x] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/features/moves/components/MoveTabs.test.tsx
```

Expected: FAIL — component does not exist.

- [x] **Step 3: Create MoveTabs**

Create `src/features/moves/components/MoveTabs.tsx`:

```tsx
'use client';
import { useState } from 'react';

import MoveBreakdown from './MoveBreakdown';

type Tab = 'breakdown' | 'muscles' | 'safety';

const TABS: { id: Tab; label: string }[] = [
  { id: 'breakdown', label: 'Breakdown' },
  { id: 'muscles', label: 'Muscles' },
  { id: 'safety', label: 'Safety' },
];

export default function MoveTabs({ steps }: { steps: string[] }) {
  const [active, setActive] = useState<Tab>('breakdown');

  return (
    <div>
      <div role="tablist" className="mb-8 flex gap-8 border-b border-outline-variant/15 pb-4">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={active === id}
            onClick={() => setActive(id)}
            className={`relative font-display text-lg tracking-wide uppercase transition-colors ${
              active === id ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {label}
            {active === id && (
              <span
                aria-hidden="true"
                className="absolute -bottom-[17px] left-0 h-[2px] w-full bg-gradient-to-r from-primary to-primary-container"
              />
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {active === 'breakdown' && <MoveBreakdown steps={steps} />}
        {(active === 'muscles' || active === 'safety') && (
          <p className="py-12 text-center font-display text-xs font-bold tracking-[0.3em] text-on-surface-variant uppercase">
            Coming soon
          </p>
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/features/moves/components/MoveTabs.test.tsx
```

Expected: PASS (4 tests).

- [x] **Step 5: Commit**

```bash
git add src/features/moves/components/MoveTabs.tsx src/features/moves/components/MoveTabs.test.tsx
git commit -m "feat(moves): add MoveTabs component with coming soon placeholders"
```

---

### Task 7: MoveHero component

**Files:**

- Create: `src/features/moves/components/MoveHero.tsx`

No unit tests — animation requires real timers and DOM transitions; visual testing is done manually.

- [x] **Step 1: Create MoveHero**

Create `src/features/moves/components/MoveHero.tsx`:

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
};

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function MoveHero({ title, youtubeUrl, imageUrl }: MoveHeroProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoId = extractVideoId(youtubeUrl);
  const thumbnail =
    imageUrl ?? (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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

  return (
    <div className="relative h-[65vh] w-full overflow-hidden bg-black">
      {/* Thumbnail — zoom+blur+fade during transitioning */}
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

      {/* iframe — mounts at transitioning (opacity-0), fades in to playing */}
      {phase !== 'idle' && videoId && (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
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

- [x] **Step 2: Commit**

```bash
git add src/features/moves/components/MoveHero.tsx
git commit -m "feat(moves): add MoveHero with zoom+fade video animation"
```

---

### Task 8: MoveFavouriteButton component

**Files:**

- Create: `src/features/moves/components/MoveFavouriteButton.tsx`
- Create: `src/features/moves/components/MoveFavouriteButton.test.tsx`

- [x] **Step 1: Write failing tests**

Create `src/features/moves/components/MoveFavouriteButton.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoveFavouriteButton from './MoveFavouriteButton';

vi.mock('@/features/profile/actions', () => ({
  addFavouriteAction: vi.fn().mockResolvedValue({ success: true }),
  removeFavouriteAction: vi.fn().mockResolvedValue({ success: true }),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { addFavouriteAction, removeFavouriteAction } from '@/features/profile/actions';

const mockAdd = addFavouriteAction as ReturnType<typeof vi.fn>;
const mockRemove = removeFavouriteAction as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('MoveFavouriteButton', () => {
  it('has aria-label "Remove from favourites" when already favourited', () => {
    render(<MoveFavouriteButton moveId="m1" isFavourited={true} isAuthenticated={true} />);
    expect(screen.getByRole('button', { name: 'Remove from favourites' })).toBeInTheDocument();
  });

  it('has aria-label "Add to favourites" when not favourited', () => {
    render(<MoveFavouriteButton moveId="m1" isFavourited={false} isAuthenticated={true} />);
    expect(screen.getByRole('button', { name: 'Add to favourites' })).toBeInTheDocument();
  });

  it('redirects to /login when unauthenticated', async () => {
    const user = userEvent.setup();
    render(<MoveFavouriteButton moveId="m1" isFavourited={false} isAuthenticated={false} />);
    await user.click(screen.getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('calls addFavouriteAction when not favourited and authenticated', async () => {
    const user = userEvent.setup();
    render(<MoveFavouriteButton moveId="m1" isFavourited={false} isAuthenticated={true} />);
    await user.click(screen.getByRole('button'));
    expect(mockAdd).toHaveBeenCalledWith('m1');
  });

  it('calls removeFavouriteAction when already favourited and authenticated', async () => {
    const user = userEvent.setup();
    render(<MoveFavouriteButton moveId="m1" isFavourited={true} isAuthenticated={true} />);
    await user.click(screen.getByRole('button'));
    expect(mockRemove).toHaveBeenCalledWith('m1');
  });
});
```

- [x] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/features/moves/components/MoveFavouriteButton.test.tsx
```

Expected: FAIL — component does not exist.

- [x] **Step 3: Create MoveFavouriteButton**

Create `src/features/moves/components/MoveFavouriteButton.tsx`:

```tsx
'use client';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';

import { addFavouriteAction, removeFavouriteAction } from '@/features/profile/actions';

type MoveFavouriteButtonProps = {
  moveId: string;
  isFavourited: boolean;
  isAuthenticated: boolean;
};

export default function MoveFavouriteButton({
  moveId,
  isFavourited,
  isAuthenticated,
}: MoveFavouriteButtonProps) {
  const router = useRouter();
  const [optimisticFav, setOptimisticFav] = useOptimistic(isFavourited);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    startTransition(async () => {
      setOptimisticFav(!optimisticFav);
      if (optimisticFav) {
        await removeFavouriteAction(moveId);
      } else {
        await addFavouriteAction(moveId);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={optimisticFav ? 'Remove from favourites' : 'Add to favourites'}
      aria-pressed={optimisticFav}
      className="group flex flex-col items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur-md transition-colors ${
          optimisticFav
            ? 'bg-error/20 text-error'
            : 'bg-surface-container text-on-surface group-hover:bg-primary-container group-hover:text-primary'
        }`}
      >
        <Heart size={20} fill={optimisticFav ? 'currentColor' : 'none'} aria-hidden="true" />
      </div>
      <span className="font-sans text-[10px] tracking-widest text-on-surface-variant uppercase">
        {optimisticFav ? 'Saved' : 'Favourite'}
      </span>
    </button>
  );
}
```

- [x] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/features/moves/components/MoveFavouriteButton.test.tsx
```

Expected: PASS (5 tests).

- [x] **Step 5: Commit**

```bash
git add src/features/moves/components/MoveFavouriteButton.tsx src/features/moves/components/MoveFavouriteButton.test.tsx
git commit -m "feat(moves): add MoveFavouriteButton with optimistic toggle"
```

---

### Task 9: Wire up page.tsx + update index.ts

**Files:**

- Modify: `src/app/(main)/moves/[id]/page.tsx`
- Modify: `src/features/moves/index.ts`

- [x] **Step 1: Update index.ts**

Replace `src/features/moves/index.ts`:

```ts
export { getMoveByIdAction } from './actions';
export type { MoveDetail } from './types';
export { default as MoveHero } from './components/MoveHero';
export { default as MoveFavouriteButton } from './components/MoveFavouriteButton';
export { default as MoveSpecs } from './components/MoveSpecs';
export { default as MoveTabs } from './components/MoveTabs';
```

- [x] **Step 2: Replace page.tsx**

Replace `src/app/(main)/moves/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';

import { auth } from '@/shared/lib/auth';

import { getMoveByIdAction } from '@/features/moves';
import MoveFavouriteButton from '@/features/moves/components/MoveFavouriteButton';
import MoveHero from '@/features/moves/components/MoveHero';
import MoveSpecs from '@/features/moves/components/MoveSpecs';
import MoveTabs from '@/features/moves/components/MoveTabs';

const DIFFICULTY_BADGE: Record<string, { className: string; style?: React.CSSProperties }> = {
  BEGINNER: { className: 'bg-secondary-container text-on-secondary-container' },
  INTERMEDIATE: { className: 'bg-primary-container text-on-surface' },
  ADVANCED: { className: '', style: { backgroundColor: '#92400e', color: '#fef3c7' } },
};

export default async function MoveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [move, session] = await Promise.all([getMoveByIdAction(id), auth()]);

  if (!move) notFound();

  const isFavourited = move.favourites.length > 0;
  const isAuthenticated = !!session?.user?.id;
  const badge = DIFFICULTY_BADGE[move.difficulty] ?? DIFFICULTY_BADGE.BEGINNER;
  const difficultyLabel = move.difficulty.charAt(0) + move.difficulty.slice(1).toLowerCase();
  const poleTypeLabel = move.poleType
    ? move.poleType.charAt(0) + move.poleType.slice(1).toLowerCase()
    : null;

  return (
    <main>
      <MoveHero title={move.title} youtubeUrl={move.youtubeUrl} imageUrl={move.imageUrl} />

      <div className="mx-auto max-w-4xl space-y-10 px-6 py-10 md:px-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="mb-4 font-display text-5xl font-bold tracking-tighter text-on-surface lowercase md:text-7xl">
              {move.title.toLowerCase()}
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

        <MoveTabs steps={move.steps} />
      </div>
    </main>
  );
}
```

- [x] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass.

- [x] **Step 4: Start dev server and manually test**

```bash
npm run dev
```

Open `http://localhost:3000/moves/<any-move-id>` (get an ID from the catalog).

Verify:

- Hero shows YouTube thumbnail with play button
- Clicking play triggers letterbox bars animation, then iframe with autoplay
- Title, badges, and FavouriteButton render correctly
- FavouriteButton toggles optimistically (heart fills/unfills)
- Specs grid shows non-null fields only
- Description renders if present
- Tabs switch correctly; Muscles and Safety show "Coming soon"
- `/moves/invalid-id` renders `not-found.tsx`

- [x] **Step 5: Commit**

```bash
git add src/app/(main)/moves/[id]/page.tsx src/features/moves/index.ts
git commit -m "feat(moves): build move detail page"
```
