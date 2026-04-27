# Step Timestamps Design

## Worktree

Existing worktree: `feature/move-detail`.

## Scope

Add optional YouTube timestamps to breakdown steps so users can click a step and seek the video to that moment.

Admin sets timestamps via DB directly (admin UI is future work).

## Data Model

Replace `steps String[] @default([])` in `prisma/schema.prisma` with:

```prisma
stepsData Json @default("[]")
```

TypeScript type (defined in `src/features/moves/types.ts`):

```ts
type StepItem = { text: string; timestamp?: number }; // timestamp in seconds
```

Migration name: `replace_steps_with_steps_data`

The migration includes a data migration: each existing `steps[i]` string becomes `{ "text": steps[i] }` in `stepsData`.

## Component Architecture

```
page.tsx (RSC)
  └── MovePlayer (new Client wrapper)
       ├── MoveHero — receives seekTo?: number
       └── MoveTabs — receives onSeek: (seconds: number) => void
            └── MoveBreakdown (Client) — receives stepsData + onSeek
```

### MovePlayer

New file: `src/features/moves/components/MovePlayer.tsx`

- Client component
- Holds `seekTo: number | null` state
- Renders MoveHero with `seekTo` prop
- Renders MoveTabs with `onSeek` callback that sets `seekTo`

### MoveHero changes

- Receives `seekTo?: number` prop
- When `seekTo` changes and `phase === 'playing'`: update iframe `src` to `?start=<seconds>&autoplay=1`
- When `seekTo` changes and `phase === 'idle'`: call `handlePlay()` with `?start=<seconds>` so zoom+fade fires and video starts at the correct position
- If no `videoId`: ignore `seekTo` entirely

### MoveBreakdown changes

- Becomes a Client component (`'use client'`)
- Receives `stepsData: StepItem[]` and `onSeek: (seconds: number) => void`
- Steps with a timestamp render a clickable badge `▶ 0:45` aligned to the right
- Steps without a timestamp render no badge
- If `stepsData` is empty: renders nothing (same as current empty `steps` behaviour)

### MoveTabs changes

- Receives `onSeek: (seconds: number) => void` prop
- Passes it through to `MoveBreakdown`

## UI

Timestamp badge: right-aligned, subdued colour (`text-on-surface-variant`), small Play icon + formatted time.

Time format: `m:ss` or `mm:ss` — no hours. Examples: `0:45`, `1:30`, `10:05`.

```
01  Поднять руку вверх                           ▶ 0:45
02  Зацепить ногу за шест
03  Опустить корпус                              ▶ 1:30
```

## Edge Cases

| Case                             | Behaviour                                                        |
| -------------------------------- | ---------------------------------------------------------------- |
| Step has no timestamp            | Badge not rendered                                               |
| `stepsData` is empty             | MoveBreakdown renders nothing                                    |
| Click when `phase === 'idle'`    | Starts video from that timestamp (zoom+fade + `?start=`)         |
| Click when `phase === 'playing'` | Updates iframe `src` → reload from new position                  |
| No YouTube URL                   | `onSeek` is a no-op; MoveHero ignores `seekTo` when no `videoId` |

## Data Layer

`getMoveByIdAction` returns `stepsData: StepItem[]` (parsed from JSON) instead of `steps: string[]`.

`MoveDetail` type updated: `steps: string[]` → `stepsData: StepItem[]`.

## Tests (Vitest)

- `MoveBreakdown`: renders timestamp badge for steps with timestamp; no badge for steps without; empty stepsData renders nothing; `onSeek` called with correct seconds on badge click
- `MovePlayer`: seekTo state updates when onSeek called
- `getMoveByIdAction`: returns parsed `stepsData` array

## Future Work

Admin UI for setting timestamps alongside breakdown steps — separate feature, out of scope here.
