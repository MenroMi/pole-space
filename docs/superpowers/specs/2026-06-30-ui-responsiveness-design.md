# UI Responsiveness (Navigation & Pending Feedback) — Design

**Date:** 2026-06-30
**Branch:** `fix+catalog-tx`
**Status:** Approved
**Stack:** Next.js 16.2.6, React 19.2.4, next-intl 4.11.0

## Problem

Between a user's click and any visible change, the UI is silent. Two analyses
(navigation + mutations) found:

- **Mutations are mostly fine** — `MoveFavouriteButton`, `ProgressTracker`,
  `FavouriteMovesGallery` use `useOptimistic` + `useTransition`; auth/settings/
  admin forms use `disabled` + `Loader2`. Not the problem.
- **Navigation is the gap.** No `loading.tsx` anywhere in `src/app`; pages
  `await` all data before rendering (e.g. `catalog/page.tsx` does
  `await Promise.all([...])`, `moves/[id]/page.tsx` awaits sequentially), with
  no `Suspense` streaming. No global navigation indicator. Links
  (`MoveCard`, `RelatedMoves`, header) show no pending state. Catalog filters/
  search call `router.replace()` with no `useTransition`/pending feedback —
  stale results stay visible, then snap to new ones.

This spec covers Layers 1–3 of the proposed solution. Out of scope (deferred):
a full `Button` `loading` prop refactor, PPR, View Transitions.

## Approach

Use Next 16 / React 19 native tools, already available but unused:
`loading.tsx` (auto-Suspense instant loading), `useTransition` for the App
Router router, `usePathname`/`useSearchParams` for navigation completion.

### Layer 1 — Route loading skeletons (`loading.tsx`)

Next automatically wraps a segment's `loading.tsx` in a Suspense boundary and
shows it instantly on navigation, before the RSC payload arrives. Add to four
segments:

- `src/app/[locale]/(main)/catalog/loading.tsx` — filters-sidebar skeleton +
  a grid of ~12 card skeletons matching `MoveCard` aspect ratios (16:9 mobile,
  4:5 desktop).
- `src/app/[locale]/(main)/moves/[id]/loading.tsx` — breadcrumb + 16:9 hero +
  info-panel + related-row skeletons.
- `src/app/[locale]/(main)/profile/loading.tsx` — profile layout skeleton.
- `src/app/[locale]/admin/loading.tsx` — admin shell skeleton.

Skeletons mirror existing component layouts (sizes/tokens read from current
code; no external design file needed).

### Layer 2 — Global navigation progress bar

`src/shared/components/ui/NavigationProgress.tsx` (client), mounted once in
`src/app/[locale]/layout.tsx`:

- A thin fixed top bar in the brand/primary color.
- **Start:** a delegated `document` click listener on internal `<a href>`
  elements (same-origin, no modifier keys, not `target=_blank`) starts the bar.
- **Complete:** an effect on `usePathname()` + `useSearchParams()` hides the
  bar when either changes (navigation committed). A safety timeout also clears
  it so it can never get stuck.
- Respects `prefers-reduced-motion` (no animated travel; show/hide only).
- Decorative: `aria-hidden="true"`.

Gives feedback on every link navigation, including the moment before a skeleton
appears and on fast transitions.

### Layer 3 — Catalog filter/search pending feedback

`CatalogFilters` (in the `aside`) and `MoveGrid` (in `children`) are separate
client subtrees rendered by the server `catalog/page.tsx`. Share pending state
via a small client context:

- `CatalogTransitionContext` (`src/features/catalog/components/`) wraps the
  catalog page content and holds `useTransition` (`isPending` + a
  `startFilterTransition` callback).
- `CatalogFilters`: wrap every `router.replace(...)` call (filters and the
  debounced search) in `startFilterTransition`. While `isPending`, show a
  `Spinner` next to the search input. (In the App Router, wrapping
  `router.replace` in a transition keeps `isPending` true until the new RSC
  payload is committed.)
- A grid wrapper consumes `isPending` and dims the current results
  (`opacity` down + `pointer-events: none`), keeping layout stable.

### Shared primitives (only what Layers 1–3 need)

- `src/shared/components/ui/skeleton.tsx` — `Skeleton` shimmer block (extracted
  from the inline shimmer in `MoveModal`). Props: `width`/`height`/`radius`/
  `className`. `MoveModal`'s inline shimmer is switched to use it.
- `src/shared/components/ui/spinner.tsx` — `Spinner` wrapping
  `Loader2 animate-spin` (size/class props). Used by the progress bar and
  catalog pending.

Both respect `prefers-reduced-motion`.

## Components and changes

**Create:**

- `src/app/[locale]/(main)/catalog/loading.tsx`
- `src/app/[locale]/(main)/moves/[id]/loading.tsx`
- `src/app/[locale]/(main)/profile/loading.tsx`
- `src/app/[locale]/admin/loading.tsx`
- `src/shared/components/ui/skeleton.tsx`
- `src/shared/components/ui/spinner.tsx`
- `src/shared/components/ui/NavigationProgress.tsx`
- `src/features/catalog/components/CatalogTransitionContext.tsx`

**Modify:**

- `src/app/[locale]/layout.tsx` — mount `<NavigationProgress />`.
- `src/features/catalog/components/CatalogFilters.tsx` — wrap navigations in the
  shared transition; search-input spinner.
- catalog page / `MoveGrid` wrapper — consume `isPending`, dim grid.
- `src/features/admin/components/MoveModal.tsx` — replace inline shimmer with
  `Skeleton`.

## Data flow

```
click <a> ──▶ NavigationProgress.start()
            └▶ Next shows segment loading.tsx (skeleton) instantly
RSC ready ──▶ pathname/searchParams change ──▶ NavigationProgress.complete()

filter/search ──▶ startFilterTransition(router.replace) ──▶ isPending=true
              ├▶ CatalogFilters: search spinner
              └▶ grid wrapper: dim
new RSC committed ──▶ isPending=false ──▶ restore
```

## Error handling / edge cases

- Progress bar must always complete: clear on pathname/searchParams change and
  on a safety timeout; ignore external links, modified clicks, new-tab clicks.
- `prefers-reduced-motion`: skeletons and bar show without shimmer/travel
  animation.
- Skeleton card count is a fixed visual constant (~12), independent of the real
  page size — documented as intentional, not data-driven.

## Testing

- `NavigationProgress` — unit (RTL + mocked `next/navigation`): bar appears on
  internal-link click; hides when `pathname`/`searchParams` change; ignores
  external/modified clicks.
- `CatalogFilters` — a filter change calls the shared transition and the grid
  wrapper receives `isPending`.
- `Skeleton` / `Spinner` — render tests incl. `aria-hidden`/`aria-busy` and the
  reduced-motion branch.
- `loading.tsx` — light render test that each renders its skeleton structure.

## Backward compatibility

Purely additive feedback. No data, route, or API changes. Existing behavior is
unchanged except that transitions now show skeletons/dim/bar instead of a
silent gap.
