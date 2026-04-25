# MoveHero Zoom+Fade Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the letterbox bar animation in MoveHero with a zoom+fade transition where the thumbnail scales up and blurs out while the iframe fades in simultaneously.

**Architecture:** Single file change — `MoveHero.tsx`. Phase machine `'idle' | 'entering' | 'playing'` → `'idle' | 'transitioning' | 'playing'`. Thumbnail and iframe transition in parallel via CSS `transition-all duration-500`. No new dependencies.

**Tech Stack:** React `useState`, `useRef`, `useEffect`, Tailwind v4 CSS transitions, `next/image`.

---

## File Map

| Action | Path                                         |
| ------ | -------------------------------------------- |
| Modify | `src/features/moves/components/MoveHero.tsx` |

---

### Task 1: Replace letterbox animation with zoom+fade in MoveHero

**Files:**

- Modify: `src/features/moves/components/MoveHero.tsx`

No unit tests — animation requires real DOM and timers; visual verification is done manually.

**Current file for reference** (`src/features/moves/components/MoveHero.tsx`):

```tsx
'use client';
import { Play } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'entering' | 'playing';

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
      setPhase('entering');
      timeoutRef.current = setTimeout(() => setPhase('playing'), 600);
    }
  }

  return (
    <div className="relative h-[65vh] w-full overflow-hidden bg-black">
      {phase !== 'playing' &&
        (thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            priority
            className={`object-cover transition-opacity duration-500 ${
              phase === 'entering' ? 'opacity-0' : 'opacity-80'
            }`}
          />
        ) : (
          <div className="absolute inset-0 bg-surface-container" />
        ))}

      {phase === 'playing' && videoId && (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={title}
          className="absolute inset-0 h-full w-full border-0"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
        />
      )}

      {/* letterbox bars — removed in new implementation */}

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

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent"
      />
    </div>
  );
}
```

- [ ] **Step 1: Replace MoveHero with zoom+fade implementation**

Replace `src/features/moves/components/MoveHero.tsx` with:

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
      {/* Thumbnail — visible in idle, zooms+blurs+fades during transitioning */}
      {phase !== 'playing' &&
        (thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            priority
            className={`object-cover ${
              phase === 'transitioning'
                ? 'scale-110 opacity-0 blur-sm transition-all duration-500'
                : 'blur-0 scale-100 opacity-80'
            }`}
          />
        ) : (
          <div className="absolute inset-0 bg-surface-container" />
        ))}

      {/* iframe — mounts during transitioning (opacity-0), fades in, stays for playing */}
      {phase !== 'idle' && videoId && (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={title}
          className={`absolute inset-0 h-full w-full border-0 ${
            phase === 'transitioning' ? 'opacity-0 transition-opacity duration-500' : 'opacity-100'
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

**Key changes vs current:**

- `'entering'` renamed to `'transitioning'`
- Thumbnail: `scale-110 blur-sm opacity-0 transition-all duration-500` during transition (was just `opacity-0`)
- Iframe: mounts at `phase !== 'idle'` with `opacity-0 transition-opacity duration-500` (was mounted only at `'playing'`)
- Timeout: 500ms (was 600ms) to match CSS duration
- Letterbox bars: removed entirely

- [ ] **Step 2: Check TypeScript**

```bash
cd /Users/c.szczesny/PROGRAMMING_LEARN/pole-dance-catalog/.worktrees/move-detail && npx tsc --noEmit 2>&1 | grep "MoveHero"
```

Expected: no output (no errors in MoveHero).

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/c.szczesny/PROGRAMMING_LEARN/pole-dance-catalog/.worktrees/move-detail && npx vitest run
```

Expected: all tests pass (no MoveHero unit tests exist — animation is verified manually).

- [ ] **Step 4: Start dev server and manually verify**

```bash
cd /Users/c.szczesny/PROGRAMMING_LEARN/pole-dance-catalog/.worktrees/move-detail && npm run dev
```

Open `http://localhost:3000/moves/<any-move-id>` and verify:

- Thumbnail visible at idle with play button
- Clicking play: thumbnail smoothly scales up + blurs + fades out over ~500ms
- Simultaneously: iframe fades in from opacity-0 to opacity-100
- No black bars, no jarring cut
- Video autoplays in iframe after transition
- `prefers-reduced-motion: reduce` (enable in OS): clicking play immediately shows iframe, no animation

- [ ] **Step 5: Commit**

```bash
cd /Users/c.szczesny/PROGRAMMING_LEARN/pole-dance-catalog/.worktrees/move-detail && git add src/features/moves/components/MoveHero.tsx && git commit -m "feat(moves): zoom+fade video reveal animation in MoveHero"
```
