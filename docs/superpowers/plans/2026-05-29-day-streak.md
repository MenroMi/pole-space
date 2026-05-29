# Day Streak Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded "Training Sessions" stat-card stub with a working Day Streak counter (current + longest), driven by a client `StreakPing` component that calls an idempotent server action on visit. Also remove the unused hardcoded "Elite Member" badge.

**Architecture:** 4 new columns on `User` (`timezone`, `lastActiveDate`, `currentStreak`, `longestStreak`). Client `StreakPing` mounted in `(main)/layout.tsx` fires `recordStreakActivityAction(today, tz)` on mount, navigation, and `visibilitychange`. Action dedupes per-day, increments or resets streak via pure `computeNewStreak`, persists, then `revalidatePath('/profile')` on real change. `ProfileStats` 4th card reads `currentStreak` from extended `getProfileOverviewAction` and shows `longestStreak` in subtitle when > 0.

**Tech Stack:** Next.js 16 App Router, Prisma, NextAuth, next-intl, React 19, Vitest, Tailwind v4, lucide-react. Package manager: **npm**.

**Spec:** `docs/superpowers/specs/2026-05-29-day-streak-design.md`

---

### Task 1: Add streak fields to `User` schema + run migration

**Files:**

- Modify: `prisma/schema.prisma` (User model, lines 10-29)
- Create: `prisma/migrations/<timestamp>_add_user_streak_fields/migration.sql` (auto-generated)

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Add 4 fields after `createdAt` line (around line 23), before the `progress` relation:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  firstName     String?
  lastName      String?
  username      String?   @unique
  image         String?
  location      String?
  password      String?
  role          Role      @default(USER)
  blockedAt     DateTime?
  blockReason   String?
  createdAt     DateTime  @default(now())

  timezone        String?
  lastActiveDate  String?
  currentStreak   Int      @default(0)
  longestStreak   Int      @default(0)

  progress   UserProgress[]
  favourites UserFavourite[]
  accounts   Account[]
  sessions   Session[]
}
```

- [ ] **Step 2: Run migration**

Run: `npx prisma migrate dev --name add_user_streak_fields`
Expected: prints `Applying migration \`<timestamp>\_add_user_streak_fields\``, then `Your database is now in sync with your schema.`. Creates `prisma/migrations/<timestamp>\_add_user_streak_fields/migration.sql`and regenerates`@prisma/client`.

- [ ] **Step 3: Verify Prisma client picks up new fields**

Run: `npm run typecheck`
Expected: exits 0 with no errors. The new fields are now visible to TypeScript.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(profile): add streak fields to User schema"
```

---

### Task 2: `computeNewStreak` pure function (TDD)

**Files:**

- Create: `src/features/profile/lib/streak.ts`
- Test: `src/features/profile/lib/streak.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/features/profile/lib/streak.test.ts` with full matrix:

```ts
import { describe, expect, it } from 'vitest';

import { computeNewStreak } from './streak';

describe('computeNewStreak', () => {
  it('treats null lastActiveDate as fresh start (current=1, longest=max)', () => {
    expect(computeNewStreak(null, '2026-05-29', 0, 0)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 1,
      newLongestStreak: 1,
    });
    expect(computeNewStreak(null, '2026-05-29', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 1,
      newLongestStreak: 10,
    });
  });

  it('returns shouldUpdate=false when lastActiveDate equals today', () => {
    expect(computeNewStreak('2026-05-29', '2026-05-29', 5, 10)).toEqual({
      shouldUpdate: false,
      newCurrentStreak: 5,
      newLongestStreak: 10,
    });
  });

  it('increments current on +1 day, leaves longest unchanged if not exceeded', () => {
    expect(computeNewStreak('2026-05-28', '2026-05-29', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 6,
      newLongestStreak: 10,
    });
  });

  it('increments longest when current+1 exceeds longest', () => {
    expect(computeNewStreak('2026-05-28', '2026-05-29', 10, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 11,
      newLongestStreak: 11,
    });
  });

  it('resets to 1 after a gap of 2 days, longest unchanged', () => {
    expect(computeNewStreak('2026-05-27', '2026-05-29', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 1,
      newLongestStreak: 10,
    });
  });

  it('resets to 1 after a big gap (months)', () => {
    expect(computeNewStreak('2026-01-29', '2026-05-29', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 1,
      newLongestStreak: 10,
    });
  });

  it('returns shouldUpdate=false when diff < 0 (clock skew)', () => {
    expect(computeNewStreak('2026-05-30', '2026-05-29', 5, 10)).toEqual({
      shouldUpdate: false,
      newCurrentStreak: 5,
      newLongestStreak: 10,
    });
  });

  it('starts current=1, longest=1 for brand new user with 0/0', () => {
    expect(computeNewStreak('2026-05-29', '2026-05-30', 0, 0)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 1,
      newLongestStreak: 1,
    });
  });

  it('handles year boundary correctly (Dec 31 → Jan 1)', () => {
    expect(computeNewStreak('2026-12-31', '2027-01-01', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 6,
      newLongestStreak: 10,
    });
  });

  it('handles month boundary correctly (Jan 31 → Feb 1)', () => {
    expect(computeNewStreak('2026-01-31', '2026-02-01', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 6,
      newLongestStreak: 10,
    });
  });

  it('handles leap year Feb 28 → Feb 29 (2024)', () => {
    expect(computeNewStreak('2024-02-28', '2024-02-29', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 6,
      newLongestStreak: 10,
    });
  });

  it('handles non-leap Feb 28 → Mar 1 (2026)', () => {
    expect(computeNewStreak('2026-02-28', '2026-03-01', 5, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 6,
      newLongestStreak: 10,
    });
  });

  it('treats current === longest gracefully (no off-by-one)', () => {
    // current=10, longest=10, +1 day → current=11, longest=11
    expect(computeNewStreak('2026-05-28', '2026-05-29', 10, 10)).toEqual({
      shouldUpdate: true,
      newCurrentStreak: 11,
      newLongestStreak: 11,
    });
  });

  it('throws on invalid today format', () => {
    expect(() => computeNewStreak('2026-05-28', '2026/05/29', 5, 10)).toThrow(
      'Invalid date format',
    );
  });

  it('throws on invalid lastActiveDate format', () => {
    expect(() => computeNewStreak('not-a-date', '2026-05-29', 5, 10)).toThrow(
      'Invalid date format',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/features/profile/lib/streak.test.ts`
Expected: FAIL — `Cannot find module './streak'` import error.

- [ ] **Step 3: Implement `computeNewStreak`**

Create `src/features/profile/lib/streak.ts`:

```ts
export type StreakUpdate = {
  shouldUpdate: boolean;
  newCurrentStreak: number;
  newLongestStreak: number;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function computeNewStreak(
  lastActiveDate: string | null,
  today: string,
  currentStreak: number,
  longestStreak: number,
): StreakUpdate {
  if (!DATE_RE.test(today)) throw new Error('Invalid date format');
  if (lastActiveDate !== null && !DATE_RE.test(lastActiveDate)) {
    throw new Error('Invalid date format');
  }

  if (lastActiveDate === today) {
    return {
      shouldUpdate: false,
      newCurrentStreak: currentStreak,
      newLongestStreak: longestStreak,
    };
  }

  if (lastActiveDate === null) {
    return {
      shouldUpdate: true,
      newCurrentStreak: 1,
      newLongestStreak: Math.max(longestStreak, 1),
    };
  }

  const lastMs = Date.UTC(
    Number(lastActiveDate.slice(0, 4)),
    Number(lastActiveDate.slice(5, 7)) - 1,
    Number(lastActiveDate.slice(8, 10)),
  );
  const todayMs = Date.UTC(
    Number(today.slice(0, 4)),
    Number(today.slice(5, 7)) - 1,
    Number(today.slice(8, 10)),
  );
  const diffDays = Math.round((todayMs - lastMs) / 86_400_000);

  if (diffDays < 0) {
    return {
      shouldUpdate: false,
      newCurrentStreak: currentStreak,
      newLongestStreak: longestStreak,
    };
  }

  const newCurrent = diffDays === 1 ? currentStreak + 1 : 1;
  const newLongest = Math.max(longestStreak, newCurrent);
  return { shouldUpdate: true, newCurrentStreak: newCurrent, newLongestStreak: newLongest };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/features/profile/lib/streak.test.ts`
Expected: PASS — `Test Files 1 passed (1) / Tests 15 passed (15)`.

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/lib/streak.ts src/features/profile/lib/streak.test.ts
git commit -m "feat(profile): add computeNewStreak pure function (15 tests)"
```

---

### Task 3: `recordStreakActivityAction` server action (TDD)

**Files:**

- Modify: `src/features/profile/actions.ts` (append at end)
- Modify: `src/features/profile/actions.test.ts` (append new describe block)

- [ ] **Step 1: Read existing test setup pattern**

Run: `head -40 src/features/profile/actions.test.ts`
Expected output shows the imports + mocks used by existing tests (auth mock, prisma mock). Use the same imports/mocks for new cases.

- [ ] **Step 2: Append the new test block to `actions.test.ts`**

At the end of `src/features/profile/actions.test.ts`, add:

```ts
import { recordStreakActivityAction } from './actions';

describe('recordStreakActivityAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('does nothing when session is unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    await recordStreakActivityAction('2026-05-29', 'UTC');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does nothing for invalid date format', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    await recordStreakActivityAction('2026/05/29', 'UTC');
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does nothing when user row not found', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await recordStreakActivityAction('2026-05-29', 'UTC');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('initialises streak for first-visit user (lastActiveDate=null)', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      lastActiveDate: null,
      currentStreak: 0,
      longestStreak: 0,
      timezone: null,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    await recordStreakActivityAction('2026-05-29', 'Europe/Warsaw');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        lastActiveDate: '2026-05-29',
        currentStreak: 1,
        longestStreak: 1,
        timezone: 'Europe/Warsaw',
      },
    });
  });

  it('is a no-op when lastActiveDate equals today AND tz unchanged', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      lastActiveDate: '2026-05-29',
      currentStreak: 5,
      longestStreak: 10,
      timezone: 'Europe/Warsaw',
    } as never);

    await recordStreakActivityAction('2026-05-29', 'Europe/Warsaw');

    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('updates timezone only when same day but tz changed', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      lastActiveDate: '2026-05-29',
      currentStreak: 5,
      longestStreak: 10,
      timezone: 'Europe/Warsaw',
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    await recordStreakActivityAction('2026-05-29', 'America/Los_Angeles');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        lastActiveDate: '2026-05-29',
        currentStreak: 5,
        longestStreak: 10,
        timezone: 'America/Los_Angeles',
      },
    });
  });

  it('increments both current and longest on +1 day when tied', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      lastActiveDate: '2026-05-28',
      currentStreak: 10,
      longestStreak: 10,
      timezone: 'Europe/Warsaw',
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    await recordStreakActivityAction('2026-05-29', 'Europe/Warsaw');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        lastActiveDate: '2026-05-29',
        currentStreak: 11,
        longestStreak: 11,
        timezone: 'Europe/Warsaw',
      },
    });
  });

  it('resets current to 1 on gap, longest unchanged', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      lastActiveDate: '2026-05-25',
      currentStreak: 5,
      longestStreak: 10,
      timezone: 'Europe/Warsaw',
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    await recordStreakActivityAction('2026-05-29', 'Europe/Warsaw');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        lastActiveDate: '2026-05-29',
        currentStreak: 1,
        longestStreak: 10,
        timezone: 'Europe/Warsaw',
      },
    });
  });

  it('silently swallows DB errors (no throw)', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      lastActiveDate: null,
      currentStreak: 0,
      longestStreak: 0,
      timezone: null,
    } as never);
    vi.mocked(prisma.user.update).mockRejectedValue(new Error('DB down'));

    await expect(
      recordStreakActivityAction('2026-05-29', 'Europe/Warsaw'),
    ).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it('calls revalidatePath only on real streak change', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      lastActiveDate: '2026-05-28',
      currentStreak: 5,
      longestStreak: 10,
      timezone: 'Europe/Warsaw',
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    await recordStreakActivityAction('2026-05-29', 'Europe/Warsaw');

    expect(revalidatePath).toHaveBeenCalledWith('/profile');
  });
});
```

Note: `auth`, `prisma`, and `revalidatePath` must be available via existing `vi.mock(...)` blocks at the top of the file. If `revalidatePath` is missing, add at the top:

```ts
import { revalidatePath } from 'next/cache';
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- --run src/features/profile/actions.test.ts`
Expected: FAIL — `Cannot find name 'recordStreakActivityAction'` import error.

- [ ] **Step 4: Implement the action**

Append to `src/features/profile/actions.ts` (after `getProfileOverviewAction`):

```ts
import { computeNewStreak } from './lib/streak';

export async function recordStreakActivityAction(today: string, timezone: string): Promise<void> {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastActiveDate: true,
        currentStreak: true,
        longestStreak: true,
        timezone: true,
      },
    });
    if (!user) return;

    const update = computeNewStreak(
      user.lastActiveDate,
      today,
      user.currentStreak,
      user.longestStreak,
    );

    const tzChanged = user.timezone !== timezone;
    if (!update.shouldUpdate && !tzChanged) return;

    await prisma.user.update({
      where: { id: userId },
      data: {
        lastActiveDate: update.shouldUpdate ? today : user.lastActiveDate,
        currentStreak: update.newCurrentStreak,
        longestStreak: update.newLongestStreak,
        timezone,
      },
    });

    if (update.shouldUpdate) {
      revalidatePath('/profile');
    }
  } catch (err) {
    console.error('[streak] activity record failed:', err);
  }
}
```

Verify `auth`, `prisma`, `revalidatePath` are already imported at top of file. If `revalidatePath` is missing, add: `import { revalidatePath } from 'next/cache';`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- --run src/features/profile/actions.test.ts`
Expected: PASS — all existing + 10 new `recordStreakActivityAction` cases pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/profile/actions.ts src/features/profile/actions.test.ts
git commit -m "feat(profile): add recordStreakActivityAction (10 tests)"
```

---

### Task 4: Extend `getProfileOverviewAction` to return streak fields

**Files:**

- Modify: `src/features/profile/actions.ts:230-240` (user select inside getProfileOverviewAction)

- [ ] **Step 1: Extend the `select` in `getProfileOverviewAction`**

In `src/features/profile/actions.ts`, find the `prisma.user.findUnique` block inside `getProfileOverviewAction` (around line 230-240) and add `currentStreak: true, longestStreak: true` to the select:

```ts
prisma.user.findUnique({
  where: { id: userId },
  select: {
    firstName: true,
    lastName: true,
    username: true,
    image: true,
    location: true,
    createdAt: true,
    currentStreak: true,
    longestStreak: true,
  },
}),
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: exits 0 with no errors. New fields are now part of the action's return shape via Prisma inference.

- [ ] **Step 3: Run full test suite to verify nothing broke**

Run: `npm test -- --run`
Expected: PASS — all tests still pass (extra fields are additive).

- [ ] **Step 4: Commit**

```bash
git add src/features/profile/actions.ts
git commit -m "feat(profile): expose currentStreak+longestStreak in getProfileOverviewAction"
```

---

### Task 5: i18n keys — add `dayStreak`/`bestStreak`, remove `eliteMember`/`trainingSessions`

**Files:**

- Modify: `src/i18n/messages/en.json`
- Modify: `src/i18n/messages/pl.json`

- [ ] **Step 1: Find current key locations**

Run: `grep -n '"trainingSessions"\|"eliteMember"\|"favourites":' src/i18n/messages/en.json src/i18n/messages/pl.json`
Expected: line numbers for both keys in the `profile` object of each file.

- [ ] **Step 2: Edit `src/i18n/messages/en.json`**

In the `profile` block:

- Remove `"trainingSessions": "..."` line.
- Remove `"eliteMember": "..."` line.
- Add `"dayStreak": "Day Streak"`.
- Add `"bestStreak": "best: {n}"`.

Keep alphabetical ordering if the file is alphabetised; otherwise place near `favourites`.

- [ ] **Step 3: Edit `src/i18n/messages/pl.json`**

Same surgery, with PL translations:

- Add `"dayStreak": "Seria Dni"`.
- Add `"bestStreak": "rekord: {n}"`.

- [ ] **Step 4: Verify no orphan references in code**

Run: `grep -rn "trainingSessions\|eliteMember" src/`
Expected: 2 matches — one in `ProfileStats.tsx` (will be removed in Task 7), one in `SettingsForm.tsx` (will be removed in Task 11). No other references.

- [ ] **Step 5: Run full test suite (i18n structure tests if any)**

Run: `npm test -- --run`
Expected: PASS — all tests still green. (If an i18n structure test exists and fails for orphan key removal, that test will guide the fix in later tasks.)

- [ ] **Step 6: Commit**

```bash
git add src/i18n/messages/en.json src/i18n/messages/pl.json
git commit -m "chore(i18n): add dayStreak/bestStreak, remove eliteMember/trainingSessions"
```

---

### Task 6: Extend `StatCard` with optional `subtitle` prop (TDD)

**Files:**

- Modify: `src/features/profile/components/ProfileStats.tsx`
- Create: `src/features/profile/components/ProfileStats.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/profile/components/ProfileStats.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ProfileStats from './ProfileStats';

describe('ProfileStats', () => {
  const defaults = {
    masteredCount: 12,
    inProgressCount: 3,
    favouritesCount: 7,
    currentStreak: 0,
    longestStreak: 0,
  };

  it('renders all four stat cards with values', async () => {
    render(await ProfileStats(defaults));
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // streak default
  });

  it('hides best-streak subtitle when longestStreak is 0', async () => {
    render(await ProfileStats(defaults));
    expect(screen.queryByText(/bestStreak/)).not.toBeInTheDocument();
  });

  it('shows best-streak subtitle when longestStreak > 0', async () => {
    render(await ProfileStats({ ...defaults, currentStreak: 5, longestStreak: 12 }));
    // i18n mock returns the key — verify subtitle slot rendered
    expect(screen.getByText(/bestStreak|12/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/features/profile/components/ProfileStats.test.tsx`
Expected: FAIL — props `currentStreak`/`longestStreak` are unknown on the component.

- [ ] **Step 3: Update `StatCard` and `ProfileStats` types + render**

In `src/features/profile/components/ProfileStats.tsx`:

Replace the `StatCardProps` type + `StatCard` body:

```tsx
type StatCardProps = {
  icon: ReactNode;
  value: string | number;
  label: string;
  subtitle?: string;
};

function StatCard({ icon, value, label, subtitle }: StatCardProps) {
  return (
    <div className="group flex flex-col justify-between bg-surface-low p-[18px_16px] transition-colors hover:bg-surface-container sm:p-6 md:p-8">
      <div className="mb-3 text-primary/50 transition-colors group-hover:text-primary sm:mb-6">
        <span className="inline-block transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-125 [&>svg]:h-[22px] [&>svg]:w-[22px] sm:[&>svg]:h-8 sm:[&>svg]:w-8">
          {icon}
        </span>
      </div>
      <div>
        <p className="mb-1 font-display text-[28px] font-bold text-on-surface sm:text-4xl md:text-5xl">
          {value}
        </p>
        <p className="mt-1 text-[9px] tracking-[0.12em] text-on-surface-variant uppercase sm:text-xs">
          {label}
        </p>
        {subtitle && (
          <p className="mt-0.5 font-sans text-[10px] text-on-surface-variant/60 sm:text-xs">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
```

Update `ProfileStatsProps` to include streak fields:

```tsx
type ProfileStatsProps = {
  masteredCount: number;
  inProgressCount: number;
  favouritesCount: number;
  currentStreak: number;
  longestStreak: number;
};
```

Add `currentStreak`, `longestStreak` to the destructured params of `export default async function ProfileStats(...)`:

```tsx
export default async function ProfileStats({
  masteredCount,
  inProgressCount,
  favouritesCount,
  currentStreak,
  longestStreak,
}: ProfileStatsProps) {
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/features/profile/components/ProfileStats.test.tsx`
Expected: PASS — 3 cases pass (4th card still uses old Award/trainingSessions; updated in Task 7).

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/components/ProfileStats.tsx src/features/profile/components/ProfileStats.test.tsx
git commit -m "feat(profile): extend StatCard with optional subtitle prop (3 tests)"
```

---

### Task 7: Swap 4th `ProfileStats` card to Day Streak

**Files:**

- Modify: `src/features/profile/components/ProfileStats.tsx` (4th `<StatCard>` block + import)

- [ ] **Step 1: Update imports**

In `src/features/profile/components/ProfileStats.tsx`, replace the lucide import:

```tsx
import { CheckCircle2, Flame, Heart, Rotate3D } from 'lucide-react';
```

(Remove `Award`, add `Flame`.)

- [ ] **Step 2: Replace the 4th `<StatCard>`**

Find the 4th card in the returned JSX (currently `Award` + `"—"` + `t('trainingSessions')`) and replace with:

```tsx
<StatCard
  icon={<Flame size={32} aria-hidden="true" />}
  value={currentStreak}
  label={t('dayStreak')}
  subtitle={longestStreak > 0 ? t('bestStreak', { n: longestStreak }) : undefined}
/>
```

- [ ] **Step 3: Run typecheck + tests**

Run: `npm run typecheck && npm test -- --run src/features/profile/components/ProfileStats.test.tsx`
Expected: PASS — typecheck clean, 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/profile/components/ProfileStats.tsx
git commit -m "feat(profile): swap 4th stat card to Day Streak (Flame icon)"
```

---

### Task 8: Wire `currentStreak` / `longestStreak` from `ProfileOverview` → `ProfileStats`

**Files:**

- Modify: `src/features/profile/components/ProfileOverview.tsx`

- [ ] **Step 1: Pass new props into `<ProfileStats>`**

In `src/features/profile/components/ProfileOverview.tsx`, the action already returns `user.currentStreak` and `user.longestStreak` from Task 4. Pass them through:

```tsx
<ProfileStats
  masteredCount={stats.masteredCount}
  inProgressCount={stats.inProgressCount}
  favouritesCount={stats.favouritesCount}
  currentStreak={user?.currentStreak ?? 0}
  longestStreak={user?.longestStreak ?? 0}
/>
```

- [ ] **Step 2: Run typecheck + full test suite**

Run: `npm run typecheck && npm test -- --run`
Expected: PASS — typecheck clean, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/profile/components/ProfileOverview.tsx
git commit -m "feat(profile): wire streak fields through ProfileOverview"
```

---

### Task 9: `StreakPing` client component (TDD)

**Files:**

- Create: `src/features/profile/components/StreakPing.tsx`
- Create: `src/features/profile/components/StreakPing.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/profile/components/StreakPing.test.tsx`:

```tsx
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { recordStreakActivityAction } from '@/features/profile/actions';
import { usePathname } from '@/i18n/navigation';

import StreakPing from './StreakPing';

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

vi.mock('@/i18n/navigation', () => ({
  usePathname: vi.fn(() => '/catalog'),
}));

vi.mock('@/features/profile/actions', () => ({
  recordStreakActivityAction: vi.fn(),
}));

import { useSession } from 'next-auth/react';

describe('StreakPing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
  });

  it('does not call action when unauthenticated', () => {
    vi.mocked(useSession).mockReturnValue({ status: 'unauthenticated' } as never);
    render(<StreakPing />);
    expect(recordStreakActivityAction).not.toHaveBeenCalled();
  });

  it('calls action on mount when authenticated', () => {
    vi.mocked(useSession).mockReturnValue({ status: 'authenticated' } as never);
    render(<StreakPing />);
    expect(recordStreakActivityAction).toHaveBeenCalledTimes(1);
    const [todayArg, tzArg] = vi.mocked(recordStreakActivityAction).mock.calls[0];
    expect(todayArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof tzArg).toBe('string');
    expect(tzArg.length).toBeGreaterThan(0);
  });

  it('re-fires on pathname change', () => {
    vi.mocked(useSession).mockReturnValue({ status: 'authenticated' } as never);
    vi.mocked(usePathname).mockReturnValue('/catalog');
    const { rerender } = render(<StreakPing />);
    expect(recordStreakActivityAction).toHaveBeenCalledTimes(1);

    vi.mocked(usePathname).mockReturnValue('/profile');
    rerender(<StreakPing />);
    expect(recordStreakActivityAction).toHaveBeenCalledTimes(2);
  });

  it('calls action on visibilitychange → visible', () => {
    vi.mocked(useSession).mockReturnValue({ status: 'authenticated' } as never);
    render(<StreakPing />);
    expect(recordStreakActivityAction).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(recordStreakActivityAction).toHaveBeenCalledTimes(2);
  });

  it('does not call action on visibilitychange → hidden', () => {
    vi.mocked(useSession).mockReturnValue({ status: 'authenticated' } as never);
    render(<StreakPing />);
    expect(recordStreakActivityAction).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(recordStreakActivityAction).toHaveBeenCalledTimes(1);
  });

  it('removes visibilitychange listener on unmount', () => {
    vi.mocked(useSession).mockReturnValue({ status: 'authenticated' } as never);
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<StreakPing />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/features/profile/components/StreakPing.test.tsx`
Expected: FAIL — `Cannot find module './StreakPing'`.

- [ ] **Step 3: Implement `StreakPing`**

Create `src/features/profile/components/StreakPing.tsx`:

```tsx
'use client';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

import { recordStreakActivityAction } from '@/features/profile/actions';
import { usePathname } from '@/i18n/navigation';

export default function StreakPing() {
  const { status } = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== 'authenticated') return;

    function ping() {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const today = new Date().toLocaleDateString('en-CA');
      void recordStreakActivityAction(today, tz);
    }

    ping();

    function onVisibility() {
      if (document.visibilityState === 'visible') ping();
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [status, pathname]);

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/features/profile/components/StreakPing.test.tsx`
Expected: PASS — 6 cases pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/profile/components/StreakPing.tsx src/features/profile/components/StreakPing.test.tsx
git commit -m "feat(profile): add StreakPing client component (6 tests)"
```

---

### Task 10: Mount `StreakPing` in `(main)/layout.tsx`

**Files:**

- Modify: `src/app/[locale]/(main)/layout.tsx`

- [ ] **Step 1: Import + render the component**

Replace the contents of `src/app/[locale]/(main)/layout.tsx` with:

```tsx
import StreakPing from '@/features/profile/components/StreakPing';
import Footer from '@/shared/components/Footer';
import Header from '@/shared/components/Header';
import MobileBottomNav from '@/shared/components/MobileBottomNav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />
      <StreakPing />
      <div className="mx-auto flex w-full max-w-[2560px] flex-1 flex-col pb-[60px] sm:pb-0">
        {children}
      </div>
      <div className="hidden sm:block">
        <Footer />
      </div>
      <MobileBottomNav />
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck + full test suite**

Run: `npm run typecheck && npm test -- --run`
Expected: PASS — all tests green.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/(main)/layout.tsx
git commit -m "feat(profile): mount StreakPing in (main)/layout"
```

---

### Task 11: Remove hardcoded "Elite Member" badge from `SettingsForm`

**Files:**

- Modify: `src/features/profile/components/SettingsForm.tsx:222-226` (badge block + possibly `BadgeCheck` import)

- [ ] **Step 1: Find the badge block**

Run: `grep -n "eliteMember\|BadgeCheck" src/features/profile/components/SettingsForm.tsx`
Expected output shows the import line and the JSX block (around lines 222-226).

- [ ] **Step 2: Delete the JSX block**

In `src/features/profile/components/SettingsForm.tsx`, remove the `<div>` that contains `<BadgeCheck>` + `{t('eliteMember')}`. Approximate lines 222-226:

```tsx
{
  /* DELETE THIS BLOCK */
}
<div className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary-container/50 px-3 py-1.5 text-xs tracking-widest text-on-secondary-container uppercase ring-1 ring-outline-variant/15">
  <BadgeCheck size={14} aria-hidden="true" />
  {t('eliteMember')}
</div>;
```

- [ ] **Step 3: Remove `BadgeCheck` from imports if unused**

Run: `grep -n "BadgeCheck" src/features/profile/components/SettingsForm.tsx`
Expected: only the import line remains.

If so, remove `BadgeCheck` from the `lucide-react` named imports at the top of the file.

- [ ] **Step 4: Verify no orphan i18n reference**

Run: `grep -rn "eliteMember" src/`
Expected: 0 matches (key removed in Task 5, last code reference removed now).

- [ ] **Step 5: Run typecheck + tests**

Run: `npm run typecheck && npm test -- --run`
Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add src/features/profile/components/SettingsForm.tsx
git commit -m "chore(profile): remove unused hardcoded Elite Member badge"
```

---

### Task 12: Final verification (build, lint, manual smoke)

**Files:** none

- [ ] **Step 1: Full lint**

Run: `npm run lint`
Expected: `0 errors` (pre-existing warning in `test-setup.ts:1:1` about import-order is acceptable).

- [ ] **Step 2: Full test suite**

Run: `npm test -- --run`
Expected: PASS — 626 tests (592 previous + 34 new: 15 streak + 10 action + 3 ProfileStats + 6 StreakPing).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: `✓ Compiled successfully` and process exits 0. Routes listed without errors.

- [ ] **Step 4: Verify orphan grep is clean**

Run: `grep -rn "trainingSessions\|eliteMember" src/`
Expected: 0 matches.

- [ ] **Step 5: Manual smoke (browser)**

Run: `npm run dev` and navigate to `/profile` as an authenticated user.
Expected:

- 4th stat card shows `Flame` icon and value `1` (or current streak) after first ping.
- Page refresh keeps the same value (dedupe works).
- After waiting until tomorrow (or simulating via DB: manually set `lastActiveDate` to yesterday), reload — value increments by 1.

- [ ] **Step 6: Final commit (if any leftovers)**

```bash
git status
# If anything remains:
git add -A
git commit -m "chore: post-implementation cleanup"
```

---

## Done

After Task 12, the branch should have:

- 4 new User columns (with migration).
- 1 new pure function + 15 unit tests.
- 1 new server action + 10 unit tests.
- Extended `getProfileOverviewAction` returning streak fields.
- 1 new client component + 6 integration tests.
- `StatCard` extended with `subtitle` + 3 component tests.
- `ProfileStats` 4th card swapped to Day Streak with Flame icon.
- Hardcoded Elite Member badge removed from `SettingsForm`.
- 4 i18n key edits (2 added, 2 removed) across en + pl.
- Mounted in `(main)/layout.tsx` — works across catalog, profile, moves.

626 tests passing, typecheck clean, build clean.
