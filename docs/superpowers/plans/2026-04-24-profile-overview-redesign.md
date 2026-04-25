# Profile Overview Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/profile` (Overview) page to match the Stitch "Profile: Overview" screen — new hero section with avatar/name/location/join date, 4 stat cards (2 real + 2 stubs), and a restyled sidebar with Lucide icons.

**Architecture:** `ProfileOverview` becomes an async Server Component that fetches user data and stats via two new server actions in parallel. `ProfileHero` and `ProfileStats` are new focused Server Components that receive typed props. `ProfileAside` is updated in-place (icons, remove avatar, remove Settings link). Location is added to the `User` model via a nullable migration.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Tailwind CSS v4, Lucide React 0.544.0, Zod, React Hook Form.

---

## File Map

| Action | File |
|--------|------|
| Modify | `prisma/schema.prisma` |
| Modify | `src/features/profile/actions.ts` |
| Modify | `src/features/profile/actions.test.ts` |
| Modify | `src/features/profile/types.ts` |
| Modify | `src/features/profile/components/ProfileAside.tsx` |
| Modify | `src/features/profile/components/ProfileOverview.tsx` |
| Modify | `src/features/profile/components/SettingsForm.tsx` |
| Modify | `src/features/profile/components/SettingsForm.test.tsx` |
| Modify | `src/app/(main)/profile/settings/page.tsx` |
| Create | `src/features/profile/components/ProfileHero.tsx` |
| Create | `src/features/profile/components/ProfileStats.tsx` |
| Modify | `docs/todos.md` |

---

### Task 1: DB — add `location` field to User

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `location String?` to User model**

In `prisma/schema.prisma`, inside the `User` model, add after the `image` field:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  location      String?   // <-- add this line
  password      String?
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())

  progress   UserProgress[]
  favourites UserFavourite[]
  accounts   Account[]
  sessions   Session[]
}
```

- [ ] **Step 2: Generate and apply migration**

Run in the worktree root (`.worktrees/profile-redesign/`):

```bash
npx prisma migrate dev --name add_location_to_user
```

Expected: new migration file created in `prisma/migrations/`, Prisma Client regenerated.

- [ ] **Step 3: Verify generate**

```bash
npx prisma generate
```

Expected: no errors, `@prisma/client` types updated with `location: string | null`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add location field to User model"
```

---

### Task 2: Server actions — `getProfileUserAction`, `getProfileStatsAction`, extend `updateProfileAction`

**Files:**
- Modify: `src/features/profile/actions.ts`
- Modify: `src/features/profile/actions.test.ts`

**Context:**
- `LearnStatus.LEARNED` = "Mastered" (no MASTERED status exists in the enum)
- `getProfileStatsAction` uses `prisma.userProgress.count` and `prisma.userFavourite.count` — the test mock needs both
- `updateProfileAction` currently only accepts `{ name }` — extend to accept optional `location`
- The existing test expects `data: { name: 'Alice' }` — keep this passing by only including `location` in data when it's provided

- [ ] **Step 1: Update the mock in `actions.test.ts` to add `count` methods**

Replace the existing mock block (lines 3–18) with:

```ts
vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    userProgress: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    userFavourite: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
```

- [ ] **Step 2: Add mock variable declarations in `actions.test.ts`**

After line `const mockFavouriteFindMany = ...` add:

```ts
const mockProgressCount = prisma.userProgress.count as ReturnType<typeof vi.fn>;
const mockFavouriteCount = prisma.userFavourite.count as ReturnType<typeof vi.fn>;
```

- [ ] **Step 3: Add imports for new actions in `actions.test.ts`**

Update the existing import block to include the three new actions:

```ts
import {
  getUserProgressAction,
  updateProgressAction,
  updateProfileAction,
  changePasswordAction,
  uploadAvatarAction,
  addFavouriteAction,
  removeFavouriteAction,
  getUserFavouritesAction,
  getProfileUserAction,
  getProfileStatsAction,
} from './actions';
```

- [ ] **Step 4: Write failing tests for `getProfileStatsAction`**

Add at the end of `actions.test.ts`:

```ts
describe('getProfileStatsAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getProfileStatsAction()).rejects.toThrow('Unauthorized');
    expect(mockProgressCount).not.toHaveBeenCalled();
    expect(mockFavouriteCount).not.toHaveBeenCalled();
  });

  it('returns mastered count and favourites count', async () => {
    mockAuth.mockResolvedValue(session);
    mockProgressCount.mockResolvedValue(7);
    mockFavouriteCount.mockResolvedValue(3);
    const result = await getProfileStatsAction();
    expect(mockProgressCount).toHaveBeenCalledWith({
      where: { userId: 'user-123', status: 'LEARNED' },
    });
    expect(mockFavouriteCount).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
    });
    expect(result).toEqual({ masteredCount: 7, favouritesCount: 3 });
  });
});
```

- [ ] **Step 5: Write failing tests for `getProfileUserAction`**

Add in `actions.test.ts`:

```ts
describe('getProfileUserAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getProfileUserAction()).rejects.toThrow('Unauthorized');
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('returns user profile fields', async () => {
    mockAuth.mockResolvedValue(session);
    const mockUser = {
      name: 'Alice Pole',
      image: 'https://cdn.example.com/avatar.jpg',
      location: 'Warsaw, PL',
      createdAt: new Date('2023-01-15'),
    };
    mockUserFindUnique.mockResolvedValue(mockUser);
    const result = await getProfileUserAction();
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      select: { name: true, image: true, location: true, createdAt: true },
    });
    expect(result).toEqual(mockUser);
  });

  it('returns null fields when user not found', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserFindUnique.mockResolvedValue(null);
    const result = await getProfileUserAction();
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 6: Write failing test for `updateProfileAction` with location**

Add in `actions.test.ts`, inside the existing `describe('updateProfileAction')` block, after the last `it`:

```ts
  it('updates name and location when location is provided', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserUpdate.mockResolvedValue({ id: 'user-123' });
    const result = await updateProfileAction({ name: 'Alice Pole', location: 'Warsaw, PL' });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { name: 'Alice Pole', location: 'Warsaw, PL' },
    });
    expect(result).toEqual({ success: true });
  });
```

- [ ] **Step 7: Run tests — verify they fail**

```bash
npx vitest run src/features/profile/actions.test.ts
```

Expected: failures for `getProfileStatsAction`, `getProfileUserAction`, and the new `updateProfileAction` test. Existing tests still pass.

- [ ] **Step 8: Implement the three actions in `actions.ts`**

Replace the local `profileNameSchema` at the top and the `updateProfileAction` function, then add the two new actions. The full set of changes:

1. Replace the local `profileNameSchema` with:

```ts
const profileSchema = z.object({
  name: z.string().min(5, 'Name must be at least 5 characters').max(50, 'Name is too long'),
  location: z.string().max(100).optional(),
});
```

2. Replace `updateProfileAction`:

```ts
export async function updateProfileAction(data: { name: string; location?: string }) {
  const userId = await requireAuth();
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) return { success: false as const, error: 'Invalid input' };
  const updateData: { name: string; location?: string } = { name: parsed.data.name };
  if (parsed.data.location !== undefined) updateData.location = parsed.data.location;
  await prisma.user.update({ where: { id: userId }, data: updateData });
  return { success: true as const };
}
```

3. Add after `getUserFavouritesAction`:

```ts
export async function getProfileUserAction() {
  const userId = await requireAuth();
  return prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, image: true, location: true, createdAt: true },
  });
}

export async function getProfileStatsAction() {
  const userId = await requireAuth();
  const [masteredCount, favouritesCount] = await Promise.all([
    prisma.userProgress.count({ where: { userId, status: 'LEARNED' } }),
    prisma.userFavourite.count({ where: { userId } }),
  ]);
  return { masteredCount, favouritesCount };
}
```

- [ ] **Step 9: Run tests — verify all pass**

```bash
npx vitest run src/features/profile/actions.test.ts
```

Expected: all tests pass including new ones.

- [ ] **Step 10: Commit**

```bash
git add src/features/profile/actions.ts src/features/profile/actions.test.ts
git commit -m "feat(profile): add getProfileUserAction, getProfileStatsAction; extend updateProfileAction with location"
```

---

### Task 3: Redesign `ProfileAside`

**Files:**
- Modify: `src/features/profile/components/ProfileAside.tsx`

**Context:** Remove avatar/name block. Remove Settings link. Add Lucide icons. Keep active-state color scheme (`bg-primary-container text-on-surface`) — it already matches the design's purple highlight. The `PageShell` gives the aside `bg-surface-low` background which matches the design's dark sidebar.

- [ ] **Step 1: Rewrite `ProfileAside.tsx`**

```tsx
'use client';
import { LayoutDashboard, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/profile', label: 'Overview', icon: LayoutDashboard },
  { href: '/profile/progress', label: 'Progress', icon: TrendingUp },
  { href: '/profile/favourite-moves', label: 'Favourite Moves', icon: Star },
];

export default function ProfileAside() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 p-4">
      {NAV_LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
            pathname === href
              ? 'bg-primary-container font-medium text-on-surface'
              : 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface'
          }`}
        >
          <Icon size={16} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Update `profile/layout.tsx` — remove props from ProfileAside**

`ProfileAside` no longer takes `name` and `image` props. Update the layout:

```tsx
import { redirect } from 'next/navigation';

import ProfileAside from '@/features/profile/components/ProfileAside';
import PageShell from '@/shared/components/PageShell';
import { SessionGuard } from '@/shared/components/SessionGuard';
import { auth } from '@/shared/lib/auth';

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <SessionGuard>
      <PageShell aside={<ProfileAside />}>{children}</PageShell>
    </SessionGuard>
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/profile/components/ProfileAside.tsx src/app/(main)/profile/layout.tsx
git commit -m "feat(profile): redesign ProfileAside — icons, remove avatar, remove Settings link"
```

---

### Task 4: Create `ProfileHero`

**Files:**
- Create: `src/features/profile/components/ProfileHero.tsx`

**Context:** Server Component. Receives user data as props (fetched by ProfileOverview). Avatar: if `image` exists → `next/image`, else → Lucide `User` icon in a styled placeholder. Location + join date shown as `"Los Angeles, CA • Joined 2021"` (or just `"Joined 2021"` if no location). ELITE MEMBER badge is a visual stub. Share button is decorative (no action). Edit Profile button → `/profile/settings`.

- [ ] **Step 1: Create `ProfileHero.tsx`**

```tsx
import { Share2, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

type ProfileHeroProps = {
  name: string | null;
  image: string | null;
  location: string | null;
  createdAt: Date;
};

export default function ProfileHero({ name, image, location, createdAt }: ProfileHeroProps) {
  const joinYear = createdAt.getFullYear();
  const meta = location ? `${location} • Joined ${joinYear}` : `Joined ${joinYear}`;

  return (
    <div className="flex items-start gap-6 p-6 pb-2">
      <div className="relative shrink-0">
        {image ? (
          <Image
            src={image}
            alt={name ?? 'Avatar'}
            width={96}
            height={96}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-container text-on-surface">
            <User size={40} aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-container/40 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-primary">
                Elite Member
              </span>
            </div>
            <h1 className="font-display text-3xl font-bold text-on-surface">
              {name ?? 'Anonymous'}
            </h1>
            <p className="text-sm text-on-surface-variant">{meta}</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Share profile"
              className="flex h-9 w-9 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-high hover:text-on-surface"
            >
              <Share2 size={16} aria-hidden="true" />
            </button>
            <Link
              href="/profile/settings"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/profile/components/ProfileHero.tsx
git commit -m "feat(profile): add ProfileHero component"
```

---

### Task 5: Create `ProfileStats`

**Files:**
- Create: `src/features/profile/components/ProfileStats.tsx`

**Context:** Server Component. Receives `masteredCount` and `favouritesCount` as props. Current Streak and Skill Tier are stubs displaying `"—"`. Four cards in a 2-col (mobile) / 4-col (md+) grid.

- [ ] **Step 1: Create `ProfileStats.tsx`**

```tsx
import { Award, CheckCircle2, Flame, Heart } from 'lucide-react';

type ProfileStatsProps = {
  masteredCount: number;
  favouritesCount: number;
};

type StatCardProps = {
  icon: React.ReactNode;
  value: string | number;
  label: string;
};

function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-container p-4">
      <div className="text-on-surface-variant">{icon}</div>
      <p className="font-display text-2xl font-bold text-on-surface">{value}</p>
      <p className="text-xs uppercase tracking-wide text-on-surface-variant">{label}</p>
    </div>
  );
}

export default function ProfileStats({ masteredCount, favouritesCount }: ProfileStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 p-6 pt-4 md:grid-cols-4">
      <StatCard
        icon={<CheckCircle2 size={20} aria-hidden="true" />}
        value={masteredCount}
        label="Moves Mastered"
      />
      <StatCard
        icon={<Heart size={20} aria-hidden="true" />}
        value={favouritesCount}
        label="Favorites"
      />
      <StatCard
        icon={<Flame size={20} aria-hidden="true" />}
        value="—"
        label="Current Streak"
      />
      <StatCard
        icon={<Award size={20} aria-hidden="true" />}
        value="—"
        label="Skill Tier"
      />
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/profile/components/ProfileStats.tsx
git commit -m "feat(profile): add ProfileStats component (mastered + favourites real, streak + tier stubs)"
```

---

### Task 6: Rebuild `ProfileOverview`

**Files:**
- Modify: `src/features/profile/components/ProfileOverview.tsx`

**Context:** Becomes an async Server Component. Fetches user and stats in parallel via `Promise.all`. Renders `ProfileHero` + `ProfileStats`. Replaces the old `ProgressWidget` + `FavouritesWidget` grid.

- [ ] **Step 1: Rewrite `ProfileOverview.tsx`**

```tsx
import { getProfileStatsAction, getProfileUserAction } from '../actions';
import ProfileHero from './ProfileHero';
import ProfileStats from './ProfileStats';

export default async function ProfileOverview() {
  const [user, stats] = await Promise.all([getProfileUserAction(), getProfileStatsAction()]);

  return (
    <div className="flex flex-col">
      <ProfileHero
        name={user?.name ?? null}
        image={user?.image ?? null}
        location={user?.location ?? null}
        createdAt={user?.createdAt ?? new Date()}
      />
      <ProfileStats
        masteredCount={stats.masteredCount}
        favouritesCount={stats.favouritesCount}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all 236+ tests pass (ProfileOverview is a server component with no unit tests; existing tests unaffected).

- [ ] **Step 4: Commit**

```bash
git add src/features/profile/components/ProfileOverview.tsx
git commit -m "feat(profile): rebuild ProfileOverview with ProfileHero + ProfileStats"
```

---

### Task 7: Update `SettingsForm` + `SettingsPage` for location

**Files:**
- Modify: `src/features/profile/components/SettingsForm.tsx`
- Modify: `src/features/profile/components/SettingsForm.test.tsx`
- Modify: `src/app/(main)/profile/settings/page.tsx`

**Context:** Rename `profileNameSchema` → `profileSchema`, add optional `location` field. Add a Location input below the Name input. Pass `location` from `SettingsPage`. Update tests — existing `profileNameSchema` tests are updated to use the new name `profileSchema`; add location validation tests.

- [ ] **Step 1: Update tests in `SettingsForm.test.tsx`**

Replace the import line and all references to `profileNameSchema`:

```ts
import { profileSchema, changePasswordSchema } from './SettingsForm';
```

Update `describe('profileNameSchema', ...)` → `describe('profileSchema', ...)`.

Update every call `profileNameSchema.safeParse(...)` → `profileSchema.safeParse(...)`.

Add location tests inside `describe('profileSchema')`:

```ts
  it('accepts valid name with no location', () => {
    const result = profileSchema.safeParse({ name: 'Alice' });
    expect(result.success).toBe(true);
  });

  it('accepts valid name with location', () => {
    const result = profileSchema.safeParse({ name: 'Alice', location: 'Warsaw, PL' });
    expect(result.success).toBe(true);
    expect(result.data?.location).toBe('Warsaw, PL');
  });

  it('rejects location longer than 100 characters', () => {
    const result = profileSchema.safeParse({ name: 'Alice', location: 'A'.repeat(101) });
    expect(result.success).toBe(false);
  });
```

- [ ] **Step 2: Run tests — verify they fail (schema not renamed yet)**

```bash
npx vitest run src/features/profile/components/SettingsForm.test.tsx
```

Expected: import error / failures for new location tests.

- [ ] **Step 3: Update `SettingsForm.tsx`**

1. Rename `profileNameSchema` → `profileSchema` and add `location`:

```ts
export const profileSchema = z.object({
  name: z.string().min(5, 'Name must be at least 5 characters').max(50, 'Name is too long'),
  location: z.string().max(100, 'Location is too long').optional(),
});
```

2. Update the `type ProfileNameValues` → `type ProfileValues`:

```ts
type ProfileValues = z.infer<typeof profileSchema>;
```

3. Update `SettingsFormProps` to include location:

```ts
type SettingsFormProps = {
  name: string | null;
  image: string | null;
  location: string | null;
  hasPassword: boolean;
};
```

4. Update `useForm` default values in the profile form:

```ts
const profileForm = useForm<ProfileValues>({
  resolver: zodResolver(profileSchema),
  defaultValues: { name: name ?? '', location: location ?? '' },
});
```

5. Rename `nameForm` → `profileForm` throughout (all `.register`, `.handleSubmit`, `.formState`, `.setError`, `.reset` references).

6. Update `handleNameSubmit` → `handleProfileSubmit`, pass both fields:

```ts
async function handleProfileSubmit(values: ProfileValues) {
  setNameSuccess(false);
  const result = await updateProfileAction({
    name: values.name,
    location: values.location || undefined,
  });
  if (!result.success) {
    profileForm.setError('name', { message: result.error });
  } else {
    setNameSuccess(true);
    router.refresh();
  }
}
```

7. Add the Location input inside the profile form section, below the name input and its error:

```tsx
<div className="flex flex-col gap-1">
  <Input
    {...profileForm.register('location')}
    placeholder="City, Country (optional)"
    aria-label="Location"
  />
  {profileForm.formState.errors.location && (
    <p className="text-sm text-destructive">
      {profileForm.formState.errors.location.message}
    </p>
  )}
</div>
```

8. Update the submit button label: `'Save name'` → `'Save profile'`, `'Saving…'` → `'Saving…'` (unchanged).

- [ ] **Step 4: Update `settings/page.tsx` to fetch and pass `location`**

```tsx
import SettingsForm from '@/features/profile/components/SettingsForm';
import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, image: true, location: true, password: true },
      })
    : null;

  return (
    <SettingsForm
      name={user?.name ?? null}
      image={user?.image ?? null}
      location={user?.location ?? null}
      hasPassword={user?.password != null}
    />
  );
}
```

- [ ] **Step 5: Run tests — verify all pass**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/profile/components/SettingsForm.tsx src/features/profile/components/SettingsForm.test.tsx src/app/(main)/profile/settings/page.tsx
git commit -m "feat(profile): add location field to SettingsForm and settings page"
```

---

### Task 8: Tech debt — update `docs/todos.md`

**Files:**
- Modify: `docs/todos.md`

- [ ] **Step 1: Add tech debt entries**

Add a new section `## Profile` (or append to existing) in `docs/todos.md`:

```markdown
## Profile

### Current Streak stat ⚠️ stub
- `ProfileStats` displays "—" for Current Streak
- Needs: streak calculation based on consecutive days of UserProgress updates (requires `updatedAt` or a dedicated `activityDate` log table)

### Skill Tier stat ⚠️ stub
- `ProfileStats` displays "—" for Skill Tier
- Suggested: derive from LEARNED count (e.g. 0–5 → Beginner, 6–20 → Intermediate, 21+ → Advanced)

### Elite Member badge ⚠️ stub
- `ProfileHero` always renders "Elite Member" badge
- Needs: membership/tier system on User model, or remove badge entirely
```

- [ ] **Step 2: Commit**

```bash
git add docs/todos.md
git commit -m "docs(todos): add profile tech debt (streak, skill tier, elite badge)"
```

---

### Task 9: Manual e2e cases

**No code changes — verification checklist for the implementer to run in the browser.**

- [ ] **Positive cases**

1. Log in → navigate to `/profile` → sidebar shows Overview (active, purple bg), Progress, Favourite Moves — no Settings link, no avatar in sidebar
2. `/profile` hero section shows: avatar (or User icon fallback if no photo), name, "Elite Member" badge, "Joined {year}" (location if set)
3. `/profile` stats show real Moves Mastered count (verify against `/profile/progress` LEARNED count) and real Favorites count (verify against `/profile/favourite-moves`)
4. Stats Current Streak and Skill Tier show "—"
5. "Edit Profile" button navigates to `/profile/settings`
6. Share button renders, does nothing on click (no error)
7. `/profile/settings` page shows the Location input field, pre-filled if previously saved
8. Save a location on `/profile/settings` → navigate back to `/profile` → location appears in hero section
9. User with no avatar → User icon placeholder renders (no broken image)
10. User with avatar → photo renders correctly (Cloudinary URL)

- [ ] **Negative cases**

1. Unauthenticated user visits `/profile` → redirected to `/login`
2. Location field left empty on settings → saves without error, hero shows only "Joined {year}"
3. Location field filled with 101+ characters → form shows validation error, does not submit
