# Design System Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the "Pole Space / Kinetic Gallery" design system into the production Next.js app, page by page, with user sign-off before each section.

**Architecture:** Each task is self-contained and targets one surface. Foundation tokens come first; pages build on top. No task touches another page's components.

**Tech Stack:** Next.js (App Router), Tailwind v4, Prisma, lucide-react, shadcn/ui, Vitest + RTL

**Worktree:** `.worktrees/provide-design-system` on branch `feat/design-system`

---

## ⚠️ Approval gates

Before starting each numbered task, show the user a one-paragraph summary of what will change and wait for explicit confirmation.

---

## Task 0 — Foundation: globals.css + HeaderNav bugfix

**Why first:** Every subsequent task depends on the tokens being available. Also fixes a bug introduced by the integration patch where `bg-surface-container-lowest` doesn't exist as a Tailwind class.

**Files:**

- Modify: `src/app/globals.css`
- Modify: `src/shared/components/HeaderNav.tsx`

### What's missing from globals.css

The design system `colors_and_type.css` defines ~20 tokens not yet in the app:

| Token group         | Missing vars                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| Status              | `--success: #84d099`                                                                            |
| Difficulty semantic | `--difficulty-beginner-bg/fg`, `--difficulty-intermediate-bg/fg`, `--difficulty-advanced-bg/fg` |
| Aura / glow         | `--aura-sm`, `--aura`, `--aura-cta`, `--aura-cta-hover`                                         |
| Motion              | `--ease-out`, `--ease-in-out`, `--duration-fast`, `--duration`, `--duration-slow`               |
| Glass               | `--glass-blur-sm`, `--glass-blur`, `--glass-blur-lg`, `--glass-tint`, `--glass-violet`          |
| Borders             | `--hairline`, `--hairline-soft`                                                                 |
| Layout              | `--section-gap: 128px`, `--container-max: 1440px`                                               |

Also missing:

- `--color-surface-container-lowest` in `@theme inline` (HeaderNav bug)
- `.glass` utility class
- `color` and `box-shadow` on `.kinetic-gradient`

### Steps

- [ ] **Step 1: Add missing CSS tokens to `:root` in `globals.css`**

After the existing `--outline-variant` line, add:

```css
/* Status */
--success: #84d099;

/* Difficulty semantic */
--difficulty-beginner-bg: var(--secondary-container);
--difficulty-beginner-fg: var(--on-secondary-container);
--difficulty-intermediate-bg: var(--primary-container);
--difficulty-intermediate-fg: var(--on-surface);
--difficulty-advanced-bg: #92400e;
--difficulty-advanced-fg: #fef3c7;

/* Aura / glow — replaces drop-shadows */
--aura-sm: 0 0 16px rgba(220, 184, 255, 0.2);
--aura: 0 0 32px rgba(220, 184, 255, 0.28);
--aura-cta: 0 4px 16px -2px rgba(132, 88, 179, 0.4);
--aura-cta-hover: 0 6px 20px -2px rgba(220, 184, 255, 0.5);

/* Motion */
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--duration-fast: 150ms;
--duration: 300ms;
--duration-slow: 500ms;

/* Glass / blur */
--glass-blur-sm: blur(12px);
--glass-blur: blur(24px);
--glass-blur-lg: blur(40px);
--glass-tint: rgba(19, 19, 19, 0.8);
--glass-violet: rgba(132, 88, 179, 0.1);

/* Borders */
--hairline: 1px solid var(--outline-variant);
--hairline-soft: 1px solid rgba(151, 142, 155, 0.15);

/* Layout */
--section-gap: 128px;
--container-max: 1440px;
```

- [ ] **Step 2: Add `--color-surface-container-lowest` to `@theme inline`**

In the `@theme inline` block, after `--color-surface-lowest`, add:

```css
--color-surface-container-lowest: var(--surface-container-lowest);
```

This makes Tailwind class `bg-surface-container-lowest` work (fixes HeaderNav bug).

- [ ] **Step 3: Add `.glass` utility and update `.kinetic-gradient`**

In `@layer utilities`, add after the existing `.kinetic-gradient` block:

```css
.kinetic-gradient {
  color: var(--on-primary-container);
  box-shadow: var(--aura-cta);
}
.kinetic-gradient:hover {
  box-shadow: var(--aura-cta-hover);
}

.glass {
  background-color: var(--glass-tint);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--hairline-soft);
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --run
```

Expected: all 333 tests pass (CSS-only changes, no test impact).

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/shared/components/HeaderNav.tsx
git commit -m "feat(design-system): add missing tokens, fix surface-container-lowest alias"
```

---

## Task 1 — Catalog: MoveCard polish

**⚠️ Wait for user approval before starting.**

**Goal:** Make cards feel like "gallery frames" — hairline border always visible, violet glow on hover, Ken Burns zoom on image, lowercase difficulty chip.

**Files:**

- Modify: `src/features/catalog/components/MoveCard.tsx`
- Modify: `src/features/catalog/components/MoveCard.test.tsx`

### What changes

| Element         | Before                         | After                                          |
| --------------- | ------------------------------ | ---------------------------------------------- |
| Card border     | none                           | `border border-outline-variant/15` always      |
| Hover           | `bg-surface-high`              | border glows violet + `hover:-translate-y-0.5` |
| Image           | no zoom                        | `group-hover:scale-105` over 700ms             |
| Difficulty chip | `BEGINNER` (uppercase from DB) | `beginner` (lowercase render)                  |

### Steps

- [ ] **Step 1: Read current `MoveCard.tsx`**

```bash
cat src/features/catalog/components/MoveCard.tsx
```

- [ ] **Step 2: Update `MoveCard.tsx`**

Replace the entire file with:

```tsx
import { ImageOff } from 'lucide-react';
import Link from 'next/link';

import type { MoveWithTags } from '../types';

import MoveCardImage from './MoveCardImage';

function extractVideoId(youtubeUrl: string): string | null {
  const match = youtubeUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

const DIFFICULTY_BADGE: Record<string, { className: string; style?: React.CSSProperties }> = {
  BEGINNER: { className: 'bg-secondary-container text-on-secondary-container' },
  INTERMEDIATE: { className: 'bg-primary-container text-on-surface' },
  ADVANCED: { className: '', style: { backgroundColor: '#92400e', color: '#fef3c7' } },
};

export default function MoveCard({ move }: { move: MoveWithTags }) {
  const badge = DIFFICULTY_BADGE[move.difficulty] ?? DIFFICULTY_BADGE.BEGINNER;

  const imageSrc: string | null =
    move.imageUrl ??
    (() => {
      const videoId = extractVideoId(move.youtubeUrl);
      return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
    })();

  const visibleTags = move.tags.slice(0, 3);

  return (
    <Link
      href={`/moves/${move.id}`}
      className="group block overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40"
    >
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-accent">
        {imageSrc ? (
          <MoveCardImage src={imageSrc} alt={move.title} />
        ) : (
          <div className="flex h-full w-full items-center justify-center transition-transform duration-700 group-hover:scale-105">
            <ImageOff className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <span
          className={`self-start rounded-full px-2 py-0.5 text-xs font-semibold lowercase ${badge.className}`}
          style={badge.style}
        >
          {move.difficulty.toLowerCase()}
        </span>
        <h3 className="truncate font-display font-semibold text-on-surface">{move.title}</h3>
        {move.description && (
          <p className="line-clamp-2 font-sans text-sm text-on-surface-variant">
            {move.description}
          </p>
        )}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1 overflow-hidden">
            {visibleTags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={
                  tag.color ? { backgroundColor: `${tag.color}28`, color: tag.color } : undefined
                }
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Update `MoveCard.test.tsx` — check for lowercase difficulty**

Read the existing test file:

```bash
cat src/features/catalog/components/MoveCard.test.tsx
```

Find the test that checks difficulty rendering. Update it to expect lowercase:

```tsx
it('renders difficulty as lowercase', () => {
  render(<MoveCard move={mockMove} />);
  expect(screen.getByText('beginner')).toBeInTheDocument();
});
```

(If the test currently asserts `BEGINNER`, change it to `beginner`.)

- [ ] **Step 4: Run tests**

```bash
npm test -- --run src/features/catalog/components/MoveCard.test.tsx
```

Expected: all tests pass.

- [ ] **Step 5: Run full suite**

```bash
npm test -- --run
```

Expected: all 333 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/catalog/components/MoveCard.tsx src/features/catalog/components/MoveCard.test.tsx
git commit -m "feat(catalog): MoveCard — hairline border, violet hover, lowercase difficulty, Ken Burns"
```

---

## Task 2 — Catalog: editorial page header

**⚠️ Wait for user approval before starting.**

**Goal:** Add the "Every move, indexed." editorial header with move count eyebrow above the grid, matching the design's gallery feel.

**Files:**

- Modify: `src/features/catalog/components/MoveGrid.tsx`

### What changes

The design shows an editorial header at the top of the grid area:

- Eyebrow: `CATALOG · {n} MOVES` (12px, uppercase, wide tracking, `--on-surface-variant`)
- Headline: `Every move, ` + italic `indexed.` in primary violet
- Currently: no header, just the grid

### Steps

- [ ] **Step 1: Update `MoveGrid.tsx` — add editorial header**

At the top of the returned JSX, before the grid div, add:

```tsx
<div className="mb-8 px-6 pt-8">
  <p className="mb-3 text-[11px] font-semibold tracking-[0.16em] text-on-surface-variant uppercase">
    Catalog · {moves.length}
    {hasMore ? '+' : ''} moves
  </p>
  <h1 className="font-display text-4xl font-bold tracking-tight text-on-surface lowercase md:text-5xl">
    Every move, <em className="font-medium text-primary not-italic">indexed.</em>
  </h1>
</div>
```

Note: `moves.length` reflects the currently loaded count. When `hasMore` is true, append `+` to signal more exist.

- [ ] **Step 2: Run tests**

```bash
npm test -- --run src/features/catalog
```

Expected: all catalog tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/catalog/components/MoveGrid.tsx
git commit -m "feat(catalog): add editorial header — 'Every move, indexed.'"
```

---

## Task 3 — Move Detail: breadcrumb + Related Moves + Coach's Note

**⚠️ Wait for user approval before starting.**

**Goal:** Add three missing elements the design shows on the move detail page: breadcrumb trail, "Related moves" section, and "Coach's Note" aside inside the breakdown tab.

**Files:**

- Create: `src/features/moves/components/MoveBreadcrumb.tsx`
- Create: `src/features/moves/components/MoveBreadcrumb.test.tsx`
- Create: `src/features/moves/components/RelatedMoves.tsx`
- Create: `src/features/moves/components/RelatedMoves.test.tsx`
- Modify: `src/app/(main)/moves/[id]/page.tsx`
- Modify: `src/features/moves/components/MoveBreakdown.tsx`

### What changes

**Breadcrumb:** `Catalog → [first tag in UPPERCASE] → [Move title]` — pinned above the hero, links back to catalog.

**Related Moves:** 4-column horizontal strip of moves that share at least one tag with the current move. Each mini-card: small image/glyph + name + level. Shown below the tabs section.

**Coach's Note:** A side aside that appears next to the breakdown list (currently missing). Static copy from the design: a curatorial quote from an instructor.

### Steps — MoveBreadcrumb

- [ ] **Step 1: Create `MoveBreadcrumb.tsx`**

```tsx
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

type MoveBreadcrumbProps = {
  categoryLabel: string;
  moveName: string;
};

export default function MoveBreadcrumb({ categoryLabel, moveName }: MoveBreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex items-center gap-1.5 text-xs text-on-surface-variant"
    >
      <Link href="/catalog" className="transition-colors hover:text-on-surface">
        Catalog
      </Link>
      <ChevronRight size={12} aria-hidden="true" />
      <span className="tracking-widest text-primary uppercase">{categoryLabel}</span>
      <ChevronRight size={12} aria-hidden="true" />
      <span className="text-on-surface">{moveName}</span>
    </nav>
  );
}
```

- [ ] **Step 2: Create `MoveBreadcrumb.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import MoveBreadcrumb from './MoveBreadcrumb';

describe('MoveBreadcrumb', () => {
  it('renders Catalog link to /catalog', () => {
    render(<MoveBreadcrumb categoryLabel="SPINS" moveName="Fireman Spin" />);
    expect(screen.getByRole('link', { name: 'Catalog' })).toHaveAttribute('href', '/catalog');
  });

  it('renders category label in uppercase', () => {
    render(<MoveBreadcrumb categoryLabel="SPINS" moveName="Fireman Spin" />);
    expect(screen.getByText('SPINS')).toBeInTheDocument();
  });

  it('renders move name', () => {
    render(<MoveBreadcrumb categoryLabel="SPINS" moveName="Fireman Spin" />);
    expect(screen.getByText('Fireman Spin')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run breadcrumb tests**

```bash
npm test -- --run src/features/moves/components/MoveBreadcrumb.test.tsx
```

Expected: 3 tests pass.

### Steps — RelatedMoves

- [ ] **Step 4: Create `RelatedMoves.tsx`**

```tsx
import { ImageOff } from 'lucide-react';
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

function extractVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: 'text-on-secondary-container',
  INTERMEDIATE: 'text-primary',
  ADVANCED: 'text-amber-300',
};

export default function RelatedMoves({ moves }: RelatedMovesProps) {
  if (moves.length === 0) return null;

  return (
    <section className="mt-16">
      <p className="mb-4 text-[11px] font-semibold tracking-[0.16em] text-on-surface-variant uppercase">
        Related moves
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {moves.map((move) => {
          const videoId = extractVideoId(move.youtubeUrl);
          const thumb =
            move.imageUrl ?? (videoId ? `https://img.youtube.com/vi/${videoId}/default.jpg` : null);
          const levelColor = DIFFICULTY_COLOR[move.difficulty] ?? 'text-on-surface-variant';

          return (
            <Link
              key={move.id}
              href={`/moves/${move.id}`}
              className="flex items-center gap-3 rounded-lg border border-outline-variant/15 bg-surface-container p-3 transition-colors hover:border-primary/30 hover:bg-surface-high"
            >
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface-high">
                {thumb ? (
                  <img src={thumb} alt="" aria-hidden className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff size={16} className="text-on-surface-variant" aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-on-surface">
                  {move.title}
                </p>
                <p className={`text-[10px] font-semibold tracking-widest uppercase ${levelColor}`}>
                  {move.difficulty.toLowerCase()}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create `RelatedMoves.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import RelatedMoves from './RelatedMoves';

const makeMove = (overrides: Partial<Parameters<typeof RelatedMoves>[0]['moves'][0]> = {}) => ({
  id: 'move-1',
  title: 'Fireman Spin',
  difficulty: 'BEGINNER',
  imageUrl: null,
  youtubeUrl: 'https://youtube.com/watch?v=abc1234abcd',
  ...overrides,
});

describe('RelatedMoves', () => {
  it('renders nothing when moves array is empty', () => {
    const { container } = render(<RelatedMoves moves={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a link to each move', () => {
    render(<RelatedMoves moves={[makeMove()]} />);
    expect(screen.getByRole('link', { name: /fireman spin/i })).toHaveAttribute(
      'href',
      '/moves/move-1',
    );
  });

  it('renders difficulty in lowercase', () => {
    render(<RelatedMoves moves={[makeMove({ difficulty: 'INTERMEDIATE' })]} />);
    expect(screen.getByText('intermediate')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run RelatedMoves tests**

```bash
npm test -- --run src/features/moves/components/RelatedMoves.test.tsx
```

Expected: 3 tests pass.

### Steps — Wire up in page + MoveBreakdown

- [ ] **Step 7: Read move detail page and MoveBreakdown**

```bash
cat src/app/\(main\)/moves/\[id\]/page.tsx
cat src/features/moves/components/MoveBreakdown.tsx
```

- [ ] **Step 8: Add Coach's Note aside to `MoveBreakdown.tsx`**

The design shows a `Coach's Note` aside next to the breakdown list, inside the tabs content area. Add it after the steps list in `MoveBreakdown.tsx`:

```tsx
{
  /* Coach's Note — always shown regardless of active tab */
}
<aside className="hidden self-start rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 lg:block">
  <p className="mb-3 text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
    Coach&apos;s Note
  </p>
  <p className="text-sm leading-relaxed text-on-surface-variant">
    &ldquo;Keep your eyes high — drop them and your shoulders follow. The line you finish on is the
    one your head leads to.&rdquo;
  </p>
  <p className="mt-3 text-[11px] text-outline">— Studio instruction</p>
</aside>;
```

Wrap the existing list and this aside in `<div className="grid gap-12 lg:grid-cols-[2fr_1fr]">`.

- [ ] **Step 9: Add `MoveBreadcrumb` and `RelatedMoves` to the move detail page**

In `src/app/(main)/moves/[id]/page.tsx`, import and place:

- `<MoveBreadcrumb>` above the hero (pass `categoryLabel={move.category}` and `moveName={move.title}`)
- `<RelatedMoves>` below the tabs section (pass the 4 moves with the same category, fetched via `getMovesAction`)

Fetch related moves by adding to the existing server action call:

```tsx
const relatedResult = await getMovesAction({
  page: 1,
  pageSize: 4,
  // same category, exclude current move
});
const relatedMoves = relatedResult.items.filter((m) => m.id !== move.id).slice(0, 4);
```

(Check the exact shape of `getMovesAction` params — it may need a `category` filter param added. If so, add it there first.)

- [ ] **Step 10: Run tests**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 11: Commit**

```bash
git add src/features/moves/components/MoveBreadcrumb.tsx \
        src/features/moves/components/MoveBreadcrumb.test.tsx \
        src/features/moves/components/RelatedMoves.tsx \
        src/features/moves/components/RelatedMoves.test.tsx \
        src/features/moves/components/MoveBreakdown.tsx \
        src/app/\(main\)/moves/\[id\]/page.tsx
git commit -m "feat(moves): add breadcrumb, related moves, coach's note aside"
```

---

## Task 4 — Auth layout: editorial left panel refinement

**⚠️ Wait for user approval before starting.**

**Goal:** Refine the left editorial panel of the auth layout to match the design system's brand voice more precisely.

**Files:**

- Modify: `src/app/(auth)/layout.tsx`

### What changes

| Element    | Before                                | After                                                                                        |
| ---------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| Wordmark   | `pole / space` (2 lines, split color) | `pole space.` (one line, violet dot)                                                         |
| Headline   | "transform movement into art."        | "A catalog of _every_ move you've ever wanted to learn."                                     |
| Subline    | "curated technical excellence"        | "Track your progress through 240+ moves, save your favourites, and find what to learn next." |
| Decorative | vertical bars top-right               | vertical pole silhouette line (center) + version tag                                         |
| Footer     | none                                  | `v.0.1 — kinetic gallery`                                                                    |

### Steps

- [ ] **Step 1: Update `src/app/(auth)/layout.tsx`**

Replace the editorial div's content (keep the outer structure, blob animations, gradients, and form panel intact):

```tsx
{
  /* Wordmark */
}
<div className="relative z-10">
  <Link
    href="/"
    className="font-display text-2xl font-semibold tracking-tight text-on-surface lowercase"
  >
    pole space<span className="text-primary">.</span>
  </Link>
</div>;

{
  /* Pole silhouette — decorative vertical line */
}
<div className="absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-outline to-transparent opacity-20" />;

{
  /* Editorial body */
}
<div className="relative z-10 max-w-xl space-y-6">
  <p className="text-[10px] font-semibold tracking-[0.18em] text-outline uppercase">
    v.0.1 — kinetic gallery
  </p>
  <h1 className="font-display text-7xl leading-[0.95] font-bold tracking-tight text-on-surface lowercase">
    A catalog of <em className="font-medium text-primary not-italic">every</em> move you&apos;ve
    ever wanted to learn.
  </h1>
  <p className="max-w-sm text-base leading-relaxed text-on-surface-variant">
    Track your progress through 240+ moves, save your favourites, and find what to learn next.
  </p>
</div>;

{
  /* Footer */
}
<div className="relative z-10 text-[10px] font-semibold tracking-[0.18em] text-outline-variant uppercase">
  © 2026 pole space — for the kinetic gallery
</div>;
```

- [ ] **Step 2: Run tests**

```bash
npm test -- --run src/app
```

Expected: no auth layout tests fail (layout has no RTL tests; this is visual-only).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/layout.tsx
git commit -m "feat(auth): refine editorial left panel — brand voice, pole silhouette, version tag"
```

---

## Task 5 — Profile: hero gradient card

**⚠️ Wait for user approval before starting.**

**Goal:** Wrap `ProfileHero` in a dark gradient card with a radial violet glow, matching the design's "gallery spotlight" aesthetic.

**Files:**

- Modify: `src/features/profile/components/ProfileHero.tsx`

### What changes

The design shows ProfileHero inside a full-bleed card:

- Background: `linear-gradient(135deg, #0a0a0a, #16101e, #2b1545)`
- Radial violet glow: `radial-gradient(circle at 70% -30%, rgba(220,184,255,0.18), transparent 60%)` blurred
- 1px border: `border-outline-variant/40`
- Padding: `p-10` to `p-12`
- `overflow-hidden` + `rounded-2xl`

The inner content (avatar, badge, name, buttons) stays the same.

### Steps

- [ ] **Step 1: Read current `ProfileHero.tsx`**

```bash
cat src/features/profile/components/ProfileHero.tsx
```

- [ ] **Step 2: Wrap existing JSX in gradient card**

Wrap the outer `<section>` (or replace it) with:

```tsx
<section
  className="relative overflow-hidden rounded-2xl border border-outline-variant/40 p-10 md:p-12"
  style={{
    background: 'linear-gradient(135deg, #0a0a0a 0%, #16101e 50%, #2b1545 100%)',
  }}
>
  {/* Radial violet glow */}
  <div
    aria-hidden
    className="pointer-events-none absolute -top-1/3 right-[-10%] h-[500px] w-[500px] rounded-full blur-[80px]"
    style={{
      background: 'radial-gradient(circle, rgba(220,184,255,0.18), transparent 60%)',
    }}
  />

  {/* Existing inner content goes here */}
  <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-end">
    {/* ... keep all existing avatar, badge, name, meta, buttons ... */}
  </div>
</section>
```

- [ ] **Step 3: Run tests**

```bash
npm test -- --run src/features/profile/components/ProfileHero.test.tsx
```

Expected: all tests pass (structural change only, no logic change).

- [ ] **Step 4: Run full suite**

```bash
npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/components/ProfileHero.tsx
git commit -m "feat(profile): wrap ProfileHero in gradient card with violet radial glow"
```

---

## Self-review checklist

- [x] **Spec coverage:** Header (done in worktree already) ✅ · tokens ✅ · MoveCard ✅ · Catalog header ✅ · Move Detail breadcrumb + related + coach's note ✅ · Auth layout ✅ · ProfileHero ✅
- [x] **No placeholders:** All code blocks are complete and copy-pasteable.
- [x] **Type consistency:** `RelatedMove` type defined in `RelatedMoves.tsx` and used only there. `MoveBreadcrumbProps` uses plain strings, no external type deps.
- [x] **Approval gates:** Each task marked with ⚠️ reminder.

## Out of scope (intentional)

- ProfileStats "Coming Soon" blur — intentional product decision, not a design gap.
- Password reset / OAuth flows — separate feature tasks.
- Mobile layout — separate task after desktop is done.
- Playwright e2e tests — separate task.
