# MoveHero Video Animation Redesign — Zoom + Fade

## Goal

Replace the letterbox bar animation in `MoveHero` with a zoom + fade transition: thumbnail scales up and blurs out while the YouTube iframe fades in simultaneously.

## Current behaviour

Phase machine: `'idle' | 'entering' | 'playing'`

- `idle` → click play → `entering`: two black bars slide in from top/bottom (letterbox)
- After 600ms timeout → `playing`: bars hidden instantly, iframe appears

## New behaviour

Phase machine: `'idle' | 'transitioning' | 'playing'`

### idle

- Thumbnail visible at `opacity-80`, `scale-100`, `blur-0`
- Play button visible

### On play click → transitioning

- Thumbnail animates: `scale-100 → scale-110`, `blur-0 → blur-sm`, `opacity-80 → opacity-0` over 500ms via CSS transition
- Iframe mounts immediately with `opacity-0`, animates to `opacity-100` over 500ms (same duration, in parallel)
- Play button fades out (`opacity-0`) immediately
- After 500ms (via `onTransitionEnd` on the thumbnail or `setTimeout`): phase → `'playing'`, thumbnail unmounts

### playing

- Only iframe in DOM, fully visible

## Implementation details

**File:** `src/features/moves/components/MoveHero.tsx`

**Phase type:** `type Phase = 'idle' | 'transitioning' | 'playing'`

**Thumbnail classes:**

```
idle:         opacity-80  scale-100  blur-0    transition-none
transitioning: opacity-0  scale-110  blur-sm   transition-all duration-500
```

**Iframe classes:**

```
transitioning: opacity-0  transition-opacity duration-500
playing:       opacity-100
```

**Timing:** `setTimeout(() => setPhase('playing'), 500)` — matches CSS duration. `useRef` cleanup on unmount.

**prefers-reduced-motion:** skip `'transitioning'`, set `'playing'` directly.

**No new dependencies.** Pure CSS transitions via Tailwind.

## Out of scope

- Letterbox bars: removed entirely
- No changes to any other component
- No changes to `page.tsx` or `index.ts`
