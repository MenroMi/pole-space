# Day Streak — Design Spec

**Date:** 2026-05-29
**Branch:** `worktree-feat+profile-completeness`
**Status:** Approved, ready for implementation plan

## Summary

Replace the hardcoded "Training Sessions" stub (`value="—"`) in `ProfileStats` with a working Day Streak counter — number of consecutive days the user has visited the app. Increments on visit; resets to 1 after a gap; tracks longest-ever streak in DB and displays as subtitle ("best: N"). Also drop the unused, hardcoded "Elite Member" badge from `SettingsForm`.

## Scope

**In scope:**

- New `User` columns: `timezone`, `lastActiveDate`, `currentStreak`, `longestStreak`.
- New pure function `computeNewStreak` (`src/features/profile/lib/streak.ts`).
- New server action `recordStreakActivityAction`.
- New client component `StreakPing`, mounted in `(main)/layout.tsx`.
- `StatCard` extended with optional `subtitle` prop.
- `ProfileStats` 4th card swapped from "Training Sessions" stub to Day Streak.
- `getProfileOverviewAction` extended to return `currentStreak` + `longestStreak`.
- i18n keys: add `profile.dayStreak`, `profile.bestStreak`; remove `profile.trainingSessions`, `profile.eliteMember`.
- Delete hardcoded "Elite Member" badge block from `SettingsForm.tsx`.
- Prisma migration for the 4 new columns.

**Explicitly out of scope** (backlog):

- Username UI.
- Elite Member criteria (badge removed, criteria deferred).
- Preferences section in Settings.
- Playwright e2e tests.
- Streak history table (only current + longest are tracked).
- Streak freezes / protection (Duolingo-style).
- Notifications / reminders.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (any authenticated page in (main) route group)     │
│                                                              │
│  StreakPing client component (mounted in (main)/layout)     │
│    useEffect deps: [status, pathname]                       │
│    + document.visibilitychange listener                     │
│      └─ reads Intl.DateTimeFormat tz + today date           │
│         └─ POST → recordStreakActivityAction(today, tz)     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Server action: recordStreakActivityAction(today, tz)       │
│    1. auth() → userId; return early if unauthenticated.     │
│    2. Validate today format (YYYY-MM-DD) via regex.         │
│    3. SELECT lastActiveDate, currentStreak, longestStreak,  │
│       timezone FROM User WHERE id = userId.                 │
│    4. Compute via computeNewStreak (pure):                  │
│       - same day → shouldUpdate=false                       │
│       - +1 day  → current++, longest=max(current, longest)  │
│       - +Nday   → current=1, longest unchanged              │
│       - diff<0  → shouldUpdate=false (clock skew)           │
│    5. If !shouldUpdate AND timezone unchanged → return.     │
│    6. UPDATE User SET lastActiveDate, currentStreak,        │
│       longestStreak, timezone.                              │
│    7. If shouldUpdate → revalidatePath('/profile').         │
│    Errors swallowed: console.error, no throw.               │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  ProfileStats (Server Component, /profile)                  │
│    reads currentStreak + longestStreak via                  │
│    getProfileOverviewAction.                                │
│    Renders 4th StatCard with:                               │
│      icon=<Flame>, value=currentStreak,                     │
│      label=t('dayStreak'),                                  │
│      subtitle=longestStreak > 0                             │
│        ? t('bestStreak', { n: longestStreak })              │
│        : undefined                                          │
└─────────────────────────────────────────────────────────────┘
```

## Data model

Add to `prisma/schema.prisma` `User` model:

```prisma
model User {
  // ... existing fields ...
  timezone        String?  // IANA TZ (e.g. "Europe/Warsaw"), null until first ping
  lastActiveDate  String?  // "YYYY-MM-DD" in user-local TZ; null = never visited
  currentStreak   Int      @default(0)
  longestStreak   Int      @default(0)
}
```

**Rationale:**

- `lastActiveDate` is stored as `String` ("YYYY-MM-DD"), not `DateTime`. The streak logic needs a local-date concept, not a UTC timestamp. Direct string compare; no TZ ambiguity in stored data.
- `timezone` stored for analytics / future "last seen at local time" display, and as a fallback if client ever fails to send a date.
- `currentStreak` / `longestStreak` default `0` → no null branches in display or compute logic.

Migration name: `add_user_streak_fields`. Backward-compatible: existing rows get defaults (null TZ/date, 0 streaks). Legacy users start their streak from 0 at first visit after deploy; previous activity is not back-filled.

## Component boundaries

| Unit                                            | Location                                           | Responsibility                                           | Depends on                                               |
| ----------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| `computeNewStreak` (pure)                       | `src/features/profile/lib/streak.ts`               | Decide streak update from current state + today          | Date string diff; nothing else                           |
| `recordStreakActivityAction`                    | `src/features/profile/actions.ts`                  | Auth + validate + dedupe + persist                       | `auth()`, `prisma`, `computeNewStreak`, `revalidatePath` |
| `StreakPing` (client)                           | `src/features/profile/components/StreakPing.tsx`   | Fire action on mount, navigation, visibility change      | `useSession`, `usePathname`, `Intl.DateTimeFormat`       |
| `StatCard` (existing, extended)                 | `src/features/profile/components/ProfileStats.tsx` | Render icon + value + label + optional subtitle          | nothing new                                              |
| `ProfileStats` (existing, extended)             | same file                                          | Pass `currentStreak` / `longestStreak` to 4th `StatCard` | `getProfileOverviewAction` shape                         |
| `getProfileOverviewAction` (existing, extended) | `src/features/profile/actions.ts`                  | Return new streak fields                                 | `prisma`                                                 |

## `computeNewStreak` contract

```ts
export type StreakUpdate = {
  shouldUpdate: boolean;
  newCurrentStreak: number;
  newLongestStreak: number;
};

export function computeNewStreak(
  lastActiveDate: string | null, // "YYYY-MM-DD" or null
  today: string, // "YYYY-MM-DD"
  currentStreak: number,
  longestStreak: number,
): StreakUpdate;
```

**Behavior:**

- `lastActiveDate === today` → `{ shouldUpdate: false }` (caller skips write).
- `lastActiveDate === null` OR diff ≥ 2 → `newCurrentStreak = 1`.
- diff === 1 → `newCurrentStreak = currentStreak + 1`.
- diff < 0 → `{ shouldUpdate: false }` (silent guard for clock skew / TZ travel west).
- In every update branch: `newLongestStreak = Math.max(longestStreak, newCurrentStreak)`.
- Invalid date format (regex `/^\d{4}-\d{2}-\d{2}$/` fails on either arg) → throws `Error('Invalid date format')`. Server action validates upfront so this is a programmer-error guard rail.

## Mount point

`StreakPing` is mounted once in `src/app/[locale]/(main)/layout.tsx` — covers `/catalog`, `/profile/*`, `/moves/[id]`, and any future main routes. Admin layout has its own boundary and does not mount StreakPing (admin work is not "training activity").

Mounting in main layout (not Header) chosen because:

- Header is a Server Component running `auth()` per render. Calling a server action from there would mean DB write on every page render (the server-action call would happen unconditionally; the dedupe is inside the action, but the auth + SELECT still happens).
- Client mount fires once per page-load + reacts to navigation + visibility — captures the actual "user is in the app" semantic.

## Ping triggers

`useEffect` deps `[status, pathname]` re-fires on:

1. Initial mount (page load / hard refresh).
2. Authentication state change (login → fires; logout → early return).
3. Client-side navigation (covers cross-midnight if user clicks anything).

`document.visibilitychange` listener fires when tab becomes visible — covers cross-midnight when user returns to a tab without navigation.

Listener cleanup on unmount (cleanup fn returned from effect).

## Race conditions

Operation is **idempotent for fixed `(today, lastActiveDate)`**. Multi-tab concurrent ping:

| Tab A reads               | Tab B reads               | Tab A writes | Tab B writes | Final state                                      |
| ------------------------- | ------------------------- | ------------ | ------------ | ------------------------------------------------ |
| last=yesterday, current=5 | last=yesterday, current=5 | current=6    | current=6    | current=6 ✓                                      |
| last=today, current=6     | last=yesterday, current=5 | no-op        | current=6    | current=6 ✓ (last write wins; same target value) |

No transaction or row lock required.

## Error handling

| Failure                                                         | Behavior                                                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `auth()` returns null                                           | Early return, no DB call.                                                                             |
| Invalid date format (regex fails)                               | Early return, no DB call.                                                                             |
| `prisma.user.findUnique` returns null (user deleted mid-flight) | Early return, no `update`.                                                                            |
| `prisma.user.update` throws                                     | Caught: `console.error('[streak] activity record failed:', err)`. Action returns. Next visit retries. |

Errors are deliberately silent — Day Streak is invisible infrastructure. No toast, no error boundary trigger.

## Performance

Per page load: 1 client `useEffect` → 1 server-action call → 1 SELECT (always) + 0 or 1 UPDATE (only first ping of day). PK-indexed reads/writes, ~1–3 ms total. No effect on TTFB or FCP — fires post-hydration, asynchronously.

## i18n

Add to `src/i18n/messages/{en,pl}.json` under `profile`:

```json
"dayStreak": "Day Streak" | "Seria Dni",
"bestStreak": "best: {n}" | "rekord: {n}"
```

Remove from both:

- `profile.trainingSessions`
- `profile.eliteMember`

After removal, grep for orphans in `src/` — must be zero references.

## Testing

| Layer         | File                                                          | Cases                                                                                                                                                   |
| ------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pure logic    | `src/features/profile/lib/streak.test.ts`                     | 15 — null/same-day/+1/+N/diff<0; month/year/leap boundaries; longest-equals-current; invalid input throws                                               |
| Server action | `src/features/profile/actions.test.ts` (extend)               | 10 — auth guard, invalid date, user-not-found, first visit, same day, TZ-only change, +1 with longest tied, gap, DB throw silent, revalidatePath called |
| Component     | `src/features/profile/components/ProfileStats.test.tsx` (new) | 3 — value+label, subtitle shown, subtitle hidden                                                                                                        |
| Integration   | `src/features/profile/components/StreakPing.test.tsx` (new)   | 6 — unauthed no-op, mount fire, pathname re-fire, visibilitychange fire, hidden no-op, cleanup                                                          |

Total: ~34 new tests. All run in vitest with existing setup (jsdom + ResizeObserver stub).

Out of scope for tests: e2e (Playwright not set up), load testing (race safety argued from idempotency).

## Cleanup tasks

- Delete the hardcoded "Elite Member" badge block from `SettingsForm.tsx:222-226` and the `BadgeCheck` import if unused elsewhere.
- Remove `profile.eliteMember` from both locale files.
- Remove `profile.trainingSessions` from both locale files.

## Migration & rollout

1. `yarn prisma migrate dev --name add_user_streak_fields`
2. `yarn typecheck && yarn lint && yarn test --run` — all clean.
3. `yarn build` — no CSS / type errors.
4. Manual smoke: load `/profile` as authenticated user → 4th card shows `1` after first ping; refresh → still `1` (dedupe); change browser TZ via DevTools → check streak doesn't desync.
5. Merge → main rebuilds → all existing users start their streak from 0 on next visit.

No data migration required — defaults handle backward compat.

## Open / explicitly accepted trade-offs

- Legacy users lose historical streak: no UserProgress back-fill. Accepted: progress-events ≠ visits, derivation would be unreliable. Streak starts fresh after deploy.
- Same idle tab past midnight with no clicks AND no visibility change misses ping until next user action. Accepted: extremely rare; no setInterval added (battery + complexity cost).
- TZ change during active session: server stores most recent TZ; streak logic uses client-supplied date so behavior remains correct.
- Errors silent: no Sentry / observability hook in project yet. Accepted: console.error suffices; can wire to observability when project adds it.
