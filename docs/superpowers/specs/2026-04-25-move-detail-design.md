# Move Detail Page Design

## Worktree

New worktree branched from `main`: `feature/move-detail`.

## Scope

Full move detail page at `/moves/[id]` — currently a stub `<div>Move: {id}</div>`.

## Layout

```
Hero (full-width, ~65vh)
  └─ image (YouTube thumbnail) → iframe on click (zoom+fade animation)
  └─ Play button overlay (centered)

Below hero (max-w-4xl mx-auto, px-6 md:px-12):
  Title + badges (poleType, difficulty) + FavouriteButton
  Specs grid (gripType, entry, duration, poleType) — outside tabs
  description — outside tabs, plain text, shown only if non-null
  Tabs: Breakdown | Muscles (coming soon) | Safety (coming soon)
    └─ Breakdown: numbered steps list (hidden if steps is empty)
    └─ Muscles: coming soon placeholder
    └─ Safety: coming soon placeholder

404 if move not found.
```

## Schema Changes

Add fields to `Move` in `prisma/schema.prisma`:

```prisma
stepsData Json      @default("[]")  // { text: string; timestamp?: number }[]
gripType  String?
entry     String?
duration  String?
```

`poleType` (existing) serves as "Pole Setting" in the specs grid — no new field needed.

Migrations:

- `add_move_detail_fields` — added gripType, entry, duration, steps (String[])
- `replace_steps_with_steps_data` — replaced steps String[] with stepsData Json (for timestamp support)

See `docs/superpowers/specs/2026-04-25-step-timestamps-design.md` for the stepsData feature spec.

## Data Layer

### `getMoveByIdAction(id: string)`

Location: `src/features/moves/actions.ts`

- Reads session inside the action via `auth()`
- If session exists: `include: { tags: true, favourites: { where: { userId } } }`
- If no session: `include: { tags: true, favourites: false }`
- Returns `MoveDetail | null`

### `MoveDetail` type

Location: `src/features/moves/types.ts`

```ts
type MoveDetail = Move & {
  tags: Tag[];
  favourites: UserFavourite[]; // length 0 or 1 — signals isFavourited
};
```

`progress` removed from include — not needed until progress feature ships.

### Favourite actions

Reuse `addFavouriteAction` / `removeFavouriteAction` from `src/features/profile/actions.ts`.
Add `revalidatePath('/moves/' + moveId)` to both actions so the detail page reflects changes.

## Components

```
src/app/(main)/moves/[id]/page.tsx       RSC — fetches move, calls notFound() if null
src/features/moves/
  actions.ts                              updated getMoveByIdAction
  types.ts                                updated MoveDetail
  index.ts                                re-export new components
  components/
    MoveHero.tsx                          Client — image ↔ iframe with zoom+fade animation
    MoveFavouriteButton.tsx               Client — optimistic favourite toggle
    MoveSpecs.tsx                         RSC — specs grid
    MoveBreakdown.tsx                     RSC — numbered steps
    MoveTabs.tsx                          Client — tab switcher
```

### MoveHero

- Displays YouTube thumbnail (`imageUrl` or fallback `img.youtube.com/vi/{id}/hqdefault.jpg`)
- If no valid YouTube URL and no `imageUrl`: renders a placeholder div
- Play button centered overlay
- Phase machine: `'idle' | 'transitioning' | 'playing'`
- On click (`idle → transitioning`): thumbnail scales up (`scale-110`), blurs (`blur-sm`), and fades out (`opacity-0`) over 500ms; iframe mounts simultaneously at `opacity-0` and fades in to `opacity-100` over 500ms
- After 500ms (`transitioning → playing`): thumbnail unmounts, iframe fully visible with autoplay
- `prefers-reduced-motion`: skips transitioning, jumps directly to `playing`

### MoveFavouriteButton

- Receives `moveId: string` and `isFavourited: boolean`
- Optimistic toggle via `useOptimistic`
- Unauthenticated user: clicking redirects to `/login`
- Disabled during pending transition

### MoveSpecs

- Renders 2×2 grid on mobile, 4-col on md+
- Cards: Grip Type (`gripType`), Entry (`entry`), Duration (`duration`), Pole Setting (`poleType`)
- A card is omitted entirely if its value is null/undefined
- If all four are null: entire specs section is hidden

### MoveBreakdown

- Receives `stepsData: StepItem[]` (where `StepItem = { text: string; timestamp?: number }`)
- Numbered list (01, 02, 03…) matching mockup style
- Steps with a timestamp show a clickable `▶ 0:45` badge that seeks the video
- If `stepsData` is empty: renders nothing
- See `docs/superpowers/specs/2026-04-25-step-timestamps-design.md` for full timestamps spec

### MoveTabs

- Three tabs: Breakdown | Muscles | Safety
- Breakdown: renders `<MoveBreakdown steps={move.steps} />`
- Muscles and Safety: "Coming soon" placeholder (same style as ProfileStats overlay label)
- Tab state: `useState` (client-side only, no URL persistence needed)

## Edge Cases

| Case                        | Behaviour                                       |
| --------------------------- | ----------------------------------------------- |
| Move not found              | `notFound()` → renders `not-found.tsx`          |
| No image and no YouTube URL | Hero shows placeholder div                      |
| `steps` is `[]`             | Breakdown tab body is empty; tab still visible  |
| All spec fields null        | Entire specs grid hidden                        |
| User not authenticated      | FavouriteButton → redirect to `/login` on click |
| Favourite toggle fails      | Optimistic state reverted, error shown          |

## Tests (Vitest)

- `getMoveByIdAction`: move found with tags + favourites; move not found → null; unauthenticated → favourites not included
- `MoveSpecs`: null fields omit cards; all null → section hidden
- `MoveBreakdown`: empty steps → renders nothing; populated steps → correct count
- `MoveFavouriteButton`: optimistic add; optimistic remove; unauthenticated → no action called
