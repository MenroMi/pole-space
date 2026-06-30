# UI Responsiveness (Navigation & Pending Feedback) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the silent gap between a click and visible feedback — add instant route loading skeletons, a global navigation progress bar, and pending feedback for catalog filters/search.

**Architecture:** Use Next 16 / React 19 native tools. `loading.tsx` per segment gives instant Suspense skeletons on navigation. A small client `NavigationProgress` bar starts on internal `<a>` clicks and completes on `pathname` change. Catalog filters share a `useTransition`-based context so the filter UI shows a spinner and the grid dims while the new RSC payload loads.

**Tech Stack:** Next.js 16.2.6, React 19.2.4, next-intl 4.11.0, Vitest + Testing Library, Tailwind v4.

## Global Constraints

- Pin package versions exactly — no `^`/`~`. No new dependencies in this plan.
- Use `npm`/`npx` for all shell commands (never yarn).
- **Shared-branch workflow: do NOT commit per task.** Make a single feature
  commit at the end (Task 6). Commit message trailer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
- Brand color token is `var(--primary)` (`#dcb8ff`). The global `@keyframes shimmer`
  already exists in `src/app/globals.css` and is neutralized under
  `prefers-reduced-motion` — reuse it; do NOT redefine it.
- This repo's Next.js may differ from training data — for non-obvious Next APIs
  consult `node_modules/next/dist/docs/`. (`loading.tsx`, `usePathname`, and
  `useTransition` used here are standard.)
- `NavigationProgress` watches **`pathname` only** (not `useSearchParams`) to
  avoid the Suspense/dynamic-rendering requirement of `useSearchParams` in a
  layout. Query-only changes (catalog filters) are covered by Task 4 instead.

---

### Task 1: Shared `Skeleton` and `Spinner` primitives

**Files:**

- Create: `src/shared/components/ui/skeleton.tsx`
- Create: `src/shared/components/ui/spinner.tsx`
- Test: `src/shared/components/ui/skeleton.test.tsx`
- Test: `src/shared/components/ui/spinner.test.tsx`

**Interfaces:**

- Consumes: `cn` from `@/shared/lib/utils`, `Loader2` from `lucide-react`.
- Produces:
  - `Skeleton({ className?, style? }): JSX` — a shimmer block, `aria-hidden`.
  - `Spinner({ size?, className? }): JSX` — `Loader2` with `animate-spin`,
    `aria-hidden`, default `size={16}`.

- [ ] **Step 1: Write the failing tests**

Create `src/shared/components/ui/skeleton.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders an aria-hidden shimmer block with the shimmer animation', () => {
    const { container } = render(<Skeleton style={{ height: 20 }} />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el.style.animation).toContain('shimmer');
    expect(el.style.height).toBe('20px');
  });

  it('merges a passed className', () => {
    const { container } = render(<Skeleton className="aspect-[4/5]" />);
    expect((container.firstChild as HTMLElement).className).toContain('aspect-[4/5]');
  });
});
```

Create `src/shared/components/ui/spinner.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Spinner } from './spinner';

describe('Spinner', () => {
  it('renders an aria-hidden spinning icon', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('class')).toContain('animate-spin');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/shared/components/ui/skeleton.test.tsx src/shared/components/ui/spinner.test.tsx`
Expected: FAIL — cannot find modules `./skeleton`, `./spinner`.

- [ ] **Step 3: Implement `Skeleton`**

Create `src/shared/components/ui/skeleton.tsx`:

```tsx
import { cn } from '@/shared/lib/utils';

type SkeletonProps = {
  className?: string;
  style?: React.CSSProperties;
};

// Reuses the global `@keyframes shimmer` from globals.css, which is already
// neutralized under prefers-reduced-motion.
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(className)}
      style={{
        background:
          'linear-gradient(90deg, rgba(75,68,80,0.1) 25%, rgba(75,68,80,0.25) 50%, rgba(75,68,80,0.1) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
        borderRadius: 8,
        ...style,
      }}
    />
  );
}
```

- [ ] **Step 4: Implement `Spinner`**

Create `src/shared/components/ui/spinner.tsx`:

```tsx
import { Loader2 } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

type SpinnerProps = {
  size?: number;
  className?: string;
};

export function Spinner({ size = 16, className }: SpinnerProps) {
  return <Loader2 size={size} aria-hidden="true" className={cn('animate-spin', className)} />;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/shared/components/ui/skeleton.test.tsx src/shared/components/ui/spinner.test.tsx`
Expected: PASS (3 tests).

---

### Task 2: Route loading skeletons (`loading.tsx`)

**Files:**

- Create: `src/app/[locale]/(main)/catalog/loading.tsx`
- Create: `src/app/[locale]/(main)/moves/[id]/loading.tsx`
- Create: `src/app/[locale]/(main)/profile/loading.tsx`
- Create: `src/app/[locale]/admin/loading.tsx`
- Test: `src/app/[locale]/(main)/catalog/loading.test.tsx`

**Interfaces:**

- Consumes: `Skeleton` (Task 1), `PageShell` from `@/shared/components/PageShell`.
- Produces: default-exported React components Next renders as Suspense
  fallbacks during navigation. No props.

Note on boundaries: `catalog/page.tsx` builds its own `PageShell`, so
`catalog/loading.tsx` must reproduce it (aside + grid). `profile/` and `admin/`
sit inside layouts, so their loading files only skeleton the content area.
`moves/[id]` renders a bare `<main>`, so its loading file reproduces that.

- [ ] **Step 1: Write a render test for the catalog skeleton**

Create `src/app/[locale]/(main)/catalog/loading.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import CatalogLoading from './loading';

describe('CatalogLoading', () => {
  it('renders 12 card skeletons inside the shell', () => {
    const { container } = render(<CatalogLoading />);
    // Every Skeleton block uses the shimmer animation; the 12 cards each have one.
    const shimmering = Array.from(container.querySelectorAll('div')).filter((d) =>
      (d as HTMLElement).style.animation.includes('shimmer'),
    );
    expect(shimmering.length).toBeGreaterThanOrEqual(12);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run "src/app/[locale]/(main)/catalog/loading.test.tsx"`
Expected: FAIL — cannot find module `./loading`.

- [ ] **Step 3: Implement `catalog/loading.tsx`**

Create `src/app/[locale]/(main)/catalog/loading.tsx`:

```tsx
import PageShell from '@/shared/components/PageShell';
import { Skeleton } from '@/shared/components/ui/skeleton';

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant/15 bg-surface-container">
      <Skeleton className="aspect-[16/9] w-full sm:aspect-[4/5]" style={{ borderRadius: 0 }} />
      <div className="flex flex-col gap-2 p-3 sm:p-4">
        <Skeleton style={{ height: 16, width: '70%' }} />
        <Skeleton style={{ height: 12, width: '40%' }} />
      </div>
    </div>
  );
}

export default function CatalogLoading() {
  return (
    <PageShell
      aside={
        <div className="flex flex-col gap-4 p-4">
          <Skeleton style={{ height: 40 }} />
          <Skeleton style={{ height: 24, width: '60%' }} />
          <Skeleton style={{ height: 24, width: '50%' }} />
          <Skeleton style={{ height: 24, width: '55%' }} />
        </div>
      }
    >
      <div className="px-3.5 pt-3 pb-4 sm:p-6">
        <div className="mb-4 sm:mb-8">
          <Skeleton style={{ height: 14, width: 120, marginBottom: 12 }} />
          <Skeleton style={{ height: 40, width: '60%' }} />
        </div>
        <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
```

- [ ] **Step 4: Implement `moves/[id]/loading.tsx`**

Create `src/app/[locale]/(main)/moves/[id]/loading.tsx`:

```tsx
import { Skeleton } from '@/shared/components/ui/skeleton';

export default function MoveLoading() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-8">
      <Skeleton style={{ height: 14, width: 200, marginBottom: 16 }} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
        <Skeleton className="aspect-[16/9] w-full rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton style={{ height: 28, width: '70%' }} />
          <Skeleton style={{ height: 16, width: '40%' }} />
          <Skeleton style={{ height: 80 }} />
          <Skeleton style={{ height: 44 }} />
        </div>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Implement `profile/loading.tsx`**

Create `src/app/[locale]/(main)/profile/loading.tsx`:

```tsx
import { Skeleton } from '@/shared/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="p-4 sm:p-6">
      <Skeleton style={{ height: 28, width: 220, marginBottom: 20 }} />
      <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/5] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implement `admin/loading.tsx`**

Create `src/app/[locale]/admin/loading.tsx`:

```tsx
import { Skeleton } from '@/shared/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div className="p-6">
      <Skeleton style={{ height: 32, width: 240, marginBottom: 24 }} />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} style={{ height: 56 }} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run the catalog skeleton test**

Run: `npx vitest run "src/app/[locale]/(main)/catalog/loading.test.tsx"`
Expected: PASS.

---

### Task 3: Global `NavigationProgress` bar

**Files:**

- Create: `src/shared/components/ui/NavigationProgress.tsx`
- Modify: `src/app/[locale]/layout.tsx` (mount the bar)
- Test: `src/shared/components/ui/NavigationProgress.test.tsx`

**Interfaces:**

- Consumes: `usePathname` from `next/navigation` (the raw hook — returns the
  full locale-prefixed path).
- Produces: default-exported client component. Renders a fixed top bar; exposes
  `data-active="true"|"false"` for testability.

- [ ] **Step 1: Write the failing test**

Create `src/shared/components/ui/NavigationProgress.test.tsx`:

```tsx
import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const pathnameMock = vi.fn(() => '/en/catalog');
vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
}));

import NavigationProgress from './NavigationProgress';

function getBar(container: HTMLElement) {
  return container.querySelector('[data-active]') as HTMLElement;
}

describe('NavigationProgress', () => {
  beforeEach(() => pathnameMock.mockReturnValue('/en/catalog'));
  afterEach(() => vi.clearAllMocks());

  it('starts inactive', () => {
    const { container } = render(<NavigationProgress />);
    expect(getBar(container).getAttribute('data-active')).toBe('false');
  });

  it('activates when an internal link is clicked', () => {
    const { container } = render(
      <div>
        <a href="/en/moves/abc">go</a>
        <NavigationProgress />
      </div>,
    );
    fireEvent.click(container.querySelector('a')!);
    expect(getBar(container).getAttribute('data-active')).toBe('true');
  });

  it('deactivates when the pathname changes', () => {
    const { container, rerender } = render(<NavigationProgress />);
    fireEvent.click(document.body); // no-op
    pathnameMock.mockReturnValue('/en/moves/abc');
    rerender(<NavigationProgress />);
    expect(getBar(container).getAttribute('data-active')).toBe('false');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/shared/components/ui/NavigationProgress.test.tsx`
Expected: FAIL — cannot find module `./NavigationProgress`.

- [ ] **Step 3: Implement `NavigationProgress`**

Create `src/shared/components/ui/NavigationProgress.tsx`:

```tsx
'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// A thin top progress bar. Starts on internal <a> clicks, completes when the
// committed pathname changes. A safety timeout guarantees it never sticks.
export default function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || anchor.hasAttribute('download')) return;
      if (anchor.target && anchor.target !== '_self') return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return;
      }
      setActive(true);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Completed navigation: pathname changed → hide.
  useEffect(() => {
    setActive(false);
  }, [pathname]);

  // Safety net: never let the bar stay forever.
  useEffect(() => {
    if (!active) return;
    timeoutRef.current = setTimeout(() => setActive(false), 8000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [active]);

  return (
    <div
      data-active={active}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 100,
        background: 'var(--primary)',
        transformOrigin: 'left',
        transform: active ? 'scaleX(0.9)' : 'scaleX(0)',
        opacity: active ? 1 : 0,
        transition: active
          ? 'transform 8s cubic-bezier(0.1,0.6,0.2,1)'
          : 'opacity 200ms ease 120ms',
        pointerEvents: 'none',
      }}
    />
  );
}
```

- [ ] **Step 4: Mount the bar in the locale layout**

In `src/app/[locale]/layout.tsx`, add the import and render it inside `<body>`,
just before `<NextIntlClientProvider>`:

Add to imports (after the `Providers` import on line 9):

```tsx
import { Providers } from '@/shared/components/Providers';
import NavigationProgress from '@/shared/components/ui/NavigationProgress';
```

Change the body content:

```tsx
<body className="antialiased">
  <NavigationProgress />
  <NextIntlClientProvider messages={messages}>
    <Providers>{children}</Providers>
  </NextIntlClientProvider>
</body>
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run src/shared/components/ui/NavigationProgress.test.tsx`
Expected: PASS (3 tests).

---

### Task 4: Catalog filter/search pending feedback

**Files:**

- Create: `src/features/catalog/components/CatalogTransitionContext.tsx`
- Modify: `src/features/catalog/components/CatalogFilters.tsx`
- Modify: `src/features/catalog/components/MoveGrid.tsx`
- Modify: `src/app/[locale]/(main)/catalog/page.tsx`
- Modify: `src/features/catalog/index.ts` (export the provider if barrel-exported)
- Test: `src/features/catalog/components/CatalogTransition.test.tsx`

**Interfaces:**

- Consumes: `Spinner` (Task 1), `useRouter` from `@/i18n/navigation`.
- Produces:
  - `CatalogTransitionProvider({ children }): JSX`
  - `useCatalogTransition(): { isPending: boolean; startFilterTransition: (fn: () => void) => void }`
  - `CatalogTransitionContext` (exported for test injection).

- [ ] **Step 1: Write the failing test**

Create `src/features/catalog/components/CatalogTransition.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => k }));

import { CatalogTransitionContext } from './CatalogTransitionContext';
import MoveGrid from './MoveGrid';

const baseMove = {
  id: 'm1',
  title: 'Spin',
  description: null,
  difficulty: 'BEGINNER' as const,
  category: 'SPINS',
  poleTypes: [] as [],
  youtubeUrl: '',
  imageUrl: null,
  focalX: 0.5,
  focalY: 0.5,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [] as [],
  stepsData: null,
  gripType: null,
  entry: null,
  coachNote: null,
  coachNoteAuthor: null,
  duration: null,
};

describe('catalog pending', () => {
  it('dims the grid while a filter transition is pending', () => {
    const { container } = render(
      <CatalogTransitionContext.Provider
        value={{ isPending: true, startFilterTransition: (fn) => fn() }}
      >
        <MoveGrid
          initialMoves={[baseMove]}
          initialHasMore={false}
          totalCount={1}
          filters={{}}
          locale="en"
        />
      </CatalogTransitionContext.Provider>,
    );
    const dimmed = container.querySelector('[data-pending="true"]') as HTMLElement;
    expect(dimmed).not.toBeNull();
    expect(dimmed.style.opacity).toBe('0.5');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/features/catalog/components/CatalogTransition.test.tsx`
Expected: FAIL — cannot find module `./CatalogTransitionContext`.

- [ ] **Step 3: Implement the context**

Create `src/features/catalog/components/CatalogTransitionContext.tsx`:

```tsx
'use client';
import { createContext, useContext, useTransition } from 'react';

type CatalogTransition = {
  isPending: boolean;
  startFilterTransition: (fn: () => void) => void;
};

// Default runs the navigation directly (no transition) so consumers used
// outside a provider — e.g. in isolation tests — still work.
export const CatalogTransitionContext = createContext<CatalogTransition>({
  isPending: false,
  startFilterTransition: (fn) => fn(),
});

export function CatalogTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isPending, startTransition] = useTransition();
  return (
    <CatalogTransitionContext.Provider
      value={{ isPending, startFilterTransition: (fn) => startTransition(fn) }}
    >
      {children}
    </CatalogTransitionContext.Provider>
  );
}

export function useCatalogTransition() {
  return useContext(CatalogTransitionContext);
}
```

- [ ] **Step 4: Dim the grid in `MoveGrid`**

In `src/features/catalog/components/MoveGrid.tsx`, add the import (after the
`MoveCard` import on line 13):

```tsx
import MoveCard from './MoveCard';
import { useCatalogTransition } from './CatalogTransitionContext';
```

Inside the component, read the pending flag (after line 32, `const t = ...`):

```tsx
const t = useTranslations('catalog');
const { isPending } = useCatalogTransition();
```

Apply it to BOTH returned container `<div className="px-3.5 pt-3 pb-4 sm:p-6">`
elements (the empty-state one near line 95 and the main one near line 103) by
adding `data-pending` and a dim style. For the main return:

```tsx
  return (
    <div
      data-pending={isPending}
      className="px-3.5 pt-3 pb-4 sm:p-6"
      style={{
        opacity: isPending ? 0.5 : 1,
        pointerEvents: isPending ? 'none' : 'auto',
        transition: 'opacity 150ms ease',
      }}
    >
```

And for the empty-state return:

```tsx
    return (
      <div
        data-pending={isPending}
        className="px-3.5 pt-3 pb-4 sm:p-6"
        style={{
          opacity: isPending ? 0.5 : 1,
          pointerEvents: isPending ? 'none' : 'auto',
          transition: 'opacity 150ms ease',
        }}
      >
```

- [ ] **Step 5: Wire the transition + spinner into `CatalogFilters`**

In `src/features/catalog/components/CatalogFilters.tsx`:

Add imports (after the `Input` import on line 15):

```tsx
import { Input } from '@/shared/components/ui/input';
import { Spinner } from '@/shared/components/ui/spinner';
import { useCatalogTransition } from './CatalogTransitionContext';
```

Read the context (after `const router = useRouter();` on line 52):

```tsx
const router = useRouter();
const { isPending, startFilterTransition } = useCatalogTransition();
```

Wrap the `router.replace` in `navigate` (line 80):

```tsx
const query = buildQuery(nextPoleType, nextDifficulty, nextTags, nextSearch);
startFilterTransition(() => router.replace(`/catalog${query ? `?${query}` : ''}`));
```

Wrap the `router.replace` in `handleSearchChange` (line 122):

```tsx
debounceRef.current = setTimeout(() => {
  debounceRef.current = null;
  const query = buildQuery(selectedPoleTypes, selectedDifficulties, selectedTags, value);
  startFilterTransition(() => router.replace(`/catalog${query ? `?${query}` : ''}`));
}, 300);
```

Show a spinner in the sidebar search input. Replace the trailing-icon block of
`searchInput` (the `{searchValue && (...clear button...)}`, lines 144-153) so a
spinner shows while pending, otherwise the clear button:

```tsx
{
  isPending ? (
    <span
      data-testid="search-spinner"
      className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground"
    >
      <Spinner size={16} />
    </span>
  ) : (
    searchValue && (
      <button
        type="button"
        aria-label={t('clearSearch')}
        onClick={() => navigate({ resetSearch: true })}
        className="absolute top-1/2 right-2 inline-flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    )
  );
}
```

- [ ] **Step 6: Wrap the catalog page in the provider**

In `src/app/[locale]/(main)/catalog/page.tsx`, add the import:

```tsx
import { getMovesAction, getTagsAction, CatalogFilters, MoveGrid } from '@/features/catalog';
import { CatalogTransitionProvider } from '@/features/catalog/components/CatalogTransitionContext';
```

Wrap the returned `<PageShell>...</PageShell>` in the provider:

```tsx
return (
  <CatalogTransitionProvider>
    <PageShell aside={<CatalogFilters filters={filters} availableTags={availableTags} />}>
      {/* ...unchanged... */}
    </PageShell>
  </CatalogTransitionProvider>
);
```

(The provider is a client component wrapping server-rendered children whose
client leaves — `CatalogFilters`, `MoveGrid` — read the context.)

- [ ] **Step 7: Run the pending test + typecheck**

Run: `npx vitest run src/features/catalog/components/CatalogTransition.test.tsx`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: PASS.

---

### Task 5: Switch `MoveModal` inline shimmer to the `Skeleton` primitive

**Files:**

- Modify: `src/features/admin/components/MoveModal.tsx` (the `SkeletonRow`
  function, ~lines 732-754)

**Interfaces:**

- Consumes: `Skeleton` (Task 1).
- Produces: no API change; `SkeletonRow` renders identical layout via `Skeleton`.

- [ ] **Step 1: Add the import**

In `src/features/admin/components/MoveModal.tsx`, add to imports (next to the
focal import added previously):

```tsx
import { focalToObjectPosition } from '@/features/moves/lib/focal';
import { Skeleton } from '@/shared/components/ui/skeleton';
```

- [ ] **Step 2: Rewrite `SkeletonRow` to use `Skeleton`**

Replace the whole `SkeletonRow` function (lines 732-754) with:

```tsx
function SkeletonRow({ i }: { i: number }) {
  const delay = { animationDelay: `${i * 80}ms` } as React.CSSProperties;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
      <Skeleton style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, ...delay }} />
      <Skeleton style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, ...delay }} />
      <div style={{ flex: 1 }}>
        <Skeleton
          style={{ height: 13, width: `${55 + ((i * 17) % 30)}%`, marginBottom: 6, ...delay }}
        />
        <Skeleton style={{ height: 11, width: `${30 + ((i * 13) % 20)}%`, ...delay }} />
      </div>
      <Skeleton style={{ height: 20, width: 70, borderRadius: 9999, ...delay }} />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + run the admin tests**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npx vitest run src/features/admin`
Expected: PASS (no behavioral change; shimmer markup is equivalent).

---

### Task 6: Final verification + single commit

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 2: Full test suite**

Run: `npx vitest run`
Expected: PASS (all suites green, including the new ones).

- [ ] **Step 3: Lint**

Run: `npx eslint .`
Expected: no new errors (pre-existing warning in `src/test-setup.ts` is allowed).

- [ ] **Step 4: Manual smoke (optional but recommended)**

Restart dev server and verify: clicking a catalog card shows the bar + the
move skeleton instantly; changing a filter dims the grid and shows the search
spinner; navigating to profile/admin shows their skeletons.

Run: `npm run dev` (use the `run` skill)

- [ ] **Step 5: Single feature commit**

```bash
git add -A
git commit -m "feat(ui): instant navigation feedback (skeletons, progress bar, catalog pending)

- loading.tsx skeletons for catalog, moves/[id], profile, admin
- global NavigationProgress top bar (starts on internal link clicks,
  completes on pathname change)
- catalog filters/search: shared useTransition context dims the grid and
  shows a search spinner while the new RSC payload loads
- shared Skeleton + Spinner primitives; MoveModal shimmer switched to Skeleton

Includes design spec and plan under docs/superpowers.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**

- Layer 1 (loading.tsx + Skeleton) → Tasks 1, 2. ✓
- Layer 2 (NavigationProgress + mount) → Task 3. ✓
- Layer 3 (CatalogTransitionContext + filters pending + grid dim) → Task 4. ✓
- Shared primitives (Skeleton, Spinner) → Task 1. ✓
- MoveModal shimmer switch → Task 5. ✓
- Tests for NavigationProgress, catalog pending, Skeleton/Spinner, loading → Tasks 1-4. ✓
- Single-commit workflow → Global Constraints + Task 6. ✓

**Deviation from spec, noted:** the spec mentioned the bar may watch
`searchParams`; the plan deliberately watches `pathname` only (Global
Constraints) to avoid the `useSearchParams` Suspense requirement — filter
feedback is covered by Task 4 instead. Filters/search use `<button>`/`<input>`,
not `<a>`, so the bar's click-start never fires for them; no coverage lost.

**Type consistency:** `useCatalogTransition()` returns
`{ isPending, startFilterTransition }` — used identically in MoveGrid (reads
`isPending`) and CatalogFilters (uses both). `Skeleton`/`Spinner` prop shapes
match across all call sites. `data-active` (bar) and `data-pending` (grid) are
the documented test hooks.
