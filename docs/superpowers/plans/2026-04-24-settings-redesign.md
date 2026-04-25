# Profile Settings Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/profile/settings` to match the Stitch "Profile: Settings (Dark)" screen — bento grid layout, split `name` into `firstName`/`lastName`/`username`, show email, unified Save Changes + Discard actions.

**Architecture:** DB schema removes `name`, adds `firstName`, `lastName`, `username @unique`. Auth JWT callback derives `token.name` from the two fields. Single `SettingsForm` client component holds two RHF sub-forms coordinated by one submit handler. Two focused server actions remain separate.

**Tech Stack:** Next.js 16 App Router, Prisma 7, NextAuth v5, React Hook Form, Zod, Tailwind CSS v4, Lucide React, Vitest

---

## File Map

| File | What changes |
|------|-------------|
| `prisma/schema.prisma` | Remove `name`, add `firstName`, `lastName`, `username @unique` |
| `prisma/migrations/<ts>_split_name/migration.sql` | Data-preserving migration SQL |
| `src/shared/lib/auth.config.ts` | JWT callback builds `token.name` from firstName + lastName |
| `src/features/profile/actions.ts` | `updateProfileAction` new fields + P2002; `getProfileUserAction` new select |
| `src/features/profile/actions.test.ts` | Rewrite updateProfileAction tests; new P2002 test; update getProfileUserAction mock |
| `src/features/profile/components/ProfileHero.tsx` | `name` prop → `firstName` + `lastName` |
| `src/features/profile/components/ProfileOverview.tsx` | Pass `firstName`/`lastName` to ProfileHero |
| `src/app/(main)/profile/settings/page.tsx` | Fetch new fields, pass email from session |
| `src/features/profile/components/SettingsForm.tsx` | Full redesign — bento layout, new fields, unified save |
| `src/features/profile/components/SettingsForm.test.tsx` | Rewrite schema tests, add Discard + password-skip tests |
| `docs/todos.md` | Add Preferences section tech debt |

---

### Task 1: DB migration — split `name` into `firstName`, `lastName`, `username`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_split_name_fields/migration.sql`

- [ ] **Step 1: Update schema.prisma**

Replace the `name String?` line in the User model with three new fields:

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
  createdAt     DateTime  @default(now())

  progress   UserProgress[]
  favourites UserFavourite[]
  accounts   Account[]
  sessions   Session[]
}
```

- [ ] **Step 2: Create migration without applying it**

```bash
npx prisma migrate dev --create-only --name split_name_fields
```

Expected: creates `prisma/migrations/<timestamp>_split_name_fields/migration.sql` without running it.

- [ ] **Step 3: Edit the generated migration SQL**

Open the generated `migration.sql` and replace its contents entirely with:

```sql
-- Add new columns
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Preserve existing display names: copy name → firstName
UPDATE "User" SET "firstName" = "name" WHERE "name" IS NOT NULL;

-- Drop old column
ALTER TABLE "User" DROP COLUMN "name";

-- Add unique constraint on username
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
```

- [ ] **Step 4: Apply the migration**

```bash
npx prisma migrate dev
```

Expected: `Applied 1 migration(s)` with no errors.

- [ ] **Step 5: Verify Prisma client regenerated**

```bash
npx prisma generate
```

Expected: client generated without errors. Confirm `firstName`, `lastName`, `username` appear, `name` is gone.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): split name field into firstName, lastName, username"
```

---

### Task 2: Auth callback + getProfileUserAction + ProfileHero + ProfileOverview

**Files:**
- Modify: `src/shared/lib/auth.config.ts`
- Modify: `src/features/profile/actions.ts`
- Modify: `src/features/profile/components/ProfileHero.tsx`
- Modify: `src/features/profile/components/ProfileOverview.tsx`

- [ ] **Step 1: Update JWT callback in auth.config.ts**

The `jwt` callback only has access to the `user` object on first sign-in. Set `token.name` from the new fields at that point:

```ts
import type { NextAuthConfig } from 'next-auth';

export const authBaseConfig = {
  providers: [],
  session: { strategy: 'jwt' as const },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        const u = user as { firstName?: string | null; lastName?: string | null };
        token.name = [u.firstName, u.lastName].filter(Boolean).join(' ') || null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.sub) session.user.id = token.sub;
        session.user.role = token.role as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
```

- [ ] **Step 2: Update getProfileUserAction select**

In `src/features/profile/actions.ts`, replace the select in `getProfileUserAction`:

```ts
export async function getProfileUserAction() {
  const userId = await requireAuth();
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      username: true,
      image: true,
      location: true,
      createdAt: true,
    },
  });
}
```

- [ ] **Step 3: Update ProfileHero props**

Replace `src/features/profile/components/ProfileHero.tsx` entirely:

```tsx
import { BadgeCheck, Share2, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

type ProfileHeroProps = {
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  location: string | null;
  createdAt: Date;
};

export default function ProfileHero({ firstName, lastName, image, location, createdAt }: ProfileHeroProps) {
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'anonymous';
  const joinYear = createdAt.getFullYear();
  const meta = location ? `${location} • Joined ${joinYear}` : `Joined ${joinYear}`;

  return (
    <section className="flex flex-col items-start gap-8 pt-8 md:flex-row md:items-end">
      {/* Avatar */}
      <div className="relative shrink-0 group">
        <div className="relative z-10 h-32 w-32 overflow-hidden rounded-2xl bg-surface-container ring-1 ring-outline-variant/20 md:h-40 md:w-40">
          {image ? (
            <Image
              src={image}
              alt={displayName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
              <User size={56} aria-hidden="true" />
            </div>
          )}
        </div>
        <div className="absolute inset-0 -z-10 scale-110 rounded-2xl bg-primary/20 opacity-50 blur-2xl transition-opacity duration-500 group-hover:opacity-80" />
      </div>

      {/* Name + badge + meta */}
      <div className="flex-1 space-y-2">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-secondary-container/50 px-3 py-1 text-xs uppercase tracking-widest text-on-secondary-container ring-1 ring-outline-variant/15">
          <BadgeCheck size={16} aria-hidden="true" />
          Elite Member
        </div>
        <h1 className="font-display text-4xl font-bold lowercase tracking-tighter text-on-surface md:text-6xl">
          {displayName}
        </h1>
        <p className="text-lg text-on-surface-variant">{meta}</p>
      </div>

      {/* Action buttons */}
      <div className="hidden items-center gap-4 lg:flex">
        <button
          type="button"
          aria-label="Share profile"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-high text-on-surface transition-colors hover:bg-surface-highest hover:text-primary"
        >
          <Share2 size={20} aria-hidden="true" />
        </button>
        <Link
          href="/profile/settings"
          className="kinetic-gradient cursor-pointer rounded-lg px-8 py-4 font-display text-sm font-semibold lowercase tracking-wide text-on-primary-container transition-transform duration-150 active:scale-95"
        >
          edit profile
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Update ProfileOverview**

Replace `src/features/profile/components/ProfileOverview.tsx`:

```tsx
import { getProfileStatsAction, getProfileUserAction } from '../actions';
import ProfileHero from './ProfileHero';
import ProfileStats from './ProfileStats';

export default async function ProfileOverview() {
  const [user, stats] = await Promise.all([getProfileUserAction(), getProfileStatsAction()]);

  return (
    <div className="p-6 md:p-12 space-y-12">
      <ProfileHero
        firstName={user?.firstName ?? null}
        lastName={user?.lastName ?? null}
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

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```

Expected: all tests pass (the profile action tests for `name` will break — those are fixed in Task 3).

- [ ] **Step 6: Commit**

```bash
git add src/shared/lib/auth.config.ts src/features/profile/actions.ts src/features/profile/components/ProfileHero.tsx src/features/profile/components/ProfileOverview.tsx
git commit -m "feat(profile): replace name field with firstName/lastName in auth, actions, and ProfileHero"
```

---

### Task 3: updateProfileAction — new fields + P2002 handling + tests

**Files:**
- Modify: `src/features/profile/actions.ts`
- Modify: `src/features/profile/actions.test.ts`

- [ ] **Step 1: Write failing tests first**

In `src/features/profile/actions.test.ts`, replace the entire `describe('updateProfileAction', ...)` block and update the import of `updateProfileAction` signature:

```ts
describe('updateProfileAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(updateProfileAction({})).rejects.toThrow('Unauthorized');
  });

  it('returns error for invalid username (too short)', async () => {
    mockAuth.mockResolvedValue(session);
    const result = await updateProfileAction({ username: 'a' });
    expect(result).toEqual({ success: false, error: 'Invalid input' });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('returns error for invalid username (special chars)', async () => {
    mockAuth.mockResolvedValue(session);
    const result = await updateProfileAction({ username: 'hello world' });
    expect(result).toEqual({ success: false, error: 'Invalid input' });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('updates firstName and lastName', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserUpdate.mockResolvedValue({ id: 'user-123' });
    const result = await updateProfileAction({ firstName: 'Alice', lastName: 'Pole' });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { firstName: 'Alice', lastName: 'Pole' },
    });
    expect(result).toEqual({ success: true });
  });

  it('updates username when valid', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserUpdate.mockResolvedValue({ id: 'user-123' });
    const result = await updateProfileAction({ username: 'alice_pole' });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { username: 'alice_pole' },
    });
    expect(result).toEqual({ success: true });
  });

  it('returns username taken error on P2002', async () => {
    mockAuth.mockResolvedValue(session);
    const prismaError = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
      name: 'PrismaClientKnownRequestError',
    });
    mockUserUpdate.mockRejectedValue(prismaError);
    const result = await updateProfileAction({ username: 'taken_user' });
    expect(result).toEqual({
      success: false,
      field: 'username',
      error: 'Username already taken',
    });
  });

  it('skips undefined fields (does not write them)', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserUpdate.mockResolvedValue({ id: 'user-123' });
    await updateProfileAction({ firstName: 'Alice' });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { firstName: 'Alice' },
    });
  });

  it('returns success with empty object (no-op update)', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserUpdate.mockResolvedValue({ id: 'user-123' });
    const result = await updateProfileAction({});
    expect(result).toEqual({ success: true });
  });
});
```

Also update `describe('getProfileUserAction', ...)` to match new select fields:

```ts
describe('getProfileUserAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getProfileUserAction()).rejects.toThrow('Unauthorized');
  });

  it('returns user profile fields', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserFindUnique.mockResolvedValue({
      firstName: 'Alice',
      lastName: 'Pole',
      username: 'alice_pole',
      image: null,
      location: 'Warsaw',
      createdAt: new Date('2024-01-01'),
    });
    const result = await getProfileUserAction();
    expect(mockUserFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          firstName: true,
          lastName: true,
          username: true,
        }),
      }),
    );
    expect(result?.firstName).toBe('Alice');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/features/profile/actions.test.ts
```

Expected: FAIL — `updateProfileAction` still accepts `name`, P2002 handler missing.

- [ ] **Step 3: Implement the new updateProfileAction**

In `src/features/profile/actions.ts`, add the Prisma import and replace `profileSchema` + `updateProfileAction`:

```ts
'use server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { auth } from '@/shared/lib/auth';
import { cloudinary } from '@/shared/lib/cloudinary';
import { prisma } from '@/shared/lib/prisma';
import type { LearnStatus } from '@/shared/types';

import type { FavouriteWithMove, ProgressWithMove } from './types';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

const profileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores')
    .optional(),
  location: z.string().min(1).max(100).optional(),
});
```

Replace `updateProfileAction`:

```ts
export async function updateProfileAction(data: {
  firstName?: string;
  lastName?: string;
  username?: string;
  location?: string;
}) {
  const userId = await requireAuth();
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) return { success: false as const, error: 'Invalid input' };

  const updateData: {
    firstName?: string;
    lastName?: string;
    username?: string;
    location?: string;
  } = {};
  if (parsed.data.firstName !== undefined) updateData.firstName = parsed.data.firstName;
  if (parsed.data.lastName !== undefined) updateData.lastName = parsed.data.lastName;
  if (parsed.data.username !== undefined) updateData.username = parsed.data.username;
  if (parsed.data.location !== undefined) updateData.location = parsed.data.location;

  try {
    await prisma.user.update({ where: { id: userId }, data: updateData });
    return { success: true as const };
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return { success: false as const, field: 'username', error: 'Username already taken' };
    }
    throw error;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/features/profile/actions.test.ts
```

Expected: all tests in the file pass.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/features/profile/actions.ts src/features/profile/actions.test.ts
git commit -m "feat(profile): updateProfileAction with firstName/lastName/username and P2002 handling"
```

---

### Task 4: Redesign SettingsForm — bento layout, new fields, unified save

**Files:**
- Modify: `src/features/profile/components/SettingsForm.tsx`

- [ ] **Step 1: Replace SettingsForm.tsx entirely**

```tsx
'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { BadgeCheck, Lock, User } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

import { changePasswordAction, updateProfileAction } from '../actions';

import AvatarUpload from './AvatarUpload';

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 8s2.667-5 7-5 7 5 7 5-2.667 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 2l12 12" />
      <path d="M6.5 6.5a2 2 0 002.83 2.83" />
      <path d="M4 4.3A8 8 0 001 8s2.667 5 7 5c1.1 0 2.1-.25 3-.7" />
      <path d="M12 11.7A8 8 0 0015 8s-2.667-5-7-5c-1.1 0-2.1.25-3 .7" />
    </svg>
  );
}

type PasswordFieldProps = InputHTMLAttributes<HTMLInputElement> & { error?: string };

const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ onKeyDown, onKeyUp, onBlur, error, type: _type, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    return (
      <div className="flex flex-col gap-1">
        <div className="relative">
          <Input
            ref={ref}
            type={show ? 'text' : 'password'}
            className="pr-10"
            onKeyDown={(e) => { setCapsLock(e.getModifierState('CapsLock')); onKeyDown?.(e); }}
            onKeyUp={(e) => { setCapsLock(e.getModifierState('CapsLock')); onKeyUp?.(e); }}
            onBlur={(e) => { setCapsLock(false); onBlur?.(e); }}
            {...props}
          />
          <button
            type="button"
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-outline-variant transition-colors hover:text-on-surface focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
          >
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {capsLock && (
          <p role="status" className="mt-1.5 text-xs tracking-wide text-primary/70">
            Caps Lock is on
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  },
);
PasswordField.displayName = 'PasswordField';

export const profileSchema = z.object({
  firstName: z.string().max(50, 'First name is too long').optional(),
  lastName: z.string().max(50, 'Last name is too long').optional(),
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30, 'Username is too long')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores')
    .optional()
    .or(z.literal('')),
  location: z.string().max(100, 'Location is too long').optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(100),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileValues = z.infer<typeof profileSchema>;
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

type SettingsFormProps = {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  image: string | null;
  location: string | null;
  email: string | null;
  hasPassword: boolean;
};

export default function SettingsForm({
  firstName,
  lastName,
  username,
  image,
  location,
  email,
  hasPassword,
}: SettingsFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: firstName ?? '',
      lastName: lastName ?? '',
      username: username ?? '',
      location: location ?? '',
    },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  function handleDiscard() {
    profileForm.reset();
    passwordForm.reset();
    router.push('/profile');
  }

  async function handleSave() {
    setIsPending(true);
    setProfileError(null);
    setPasswordError(null);

    const profileValues = profileForm.getValues();
    const isProfileValid = await profileForm.trigger();
    if (!isProfileValid) {
      setIsPending(false);
      return;
    }

    const profileResult = await updateProfileAction({
      firstName: profileValues.firstName || undefined,
      lastName: profileValues.lastName || undefined,
      username: profileValues.username || undefined,
      location: profileValues.location || undefined,
    });

    if (!profileResult.success) {
      if (profileResult.field === 'username') {
        profileForm.setError('username', { message: profileResult.error });
      } else {
        setProfileError(profileResult.error);
      }
      setIsPending(false);
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = passwordForm.getValues();
    if (currentPassword || newPassword || confirmPassword) {
      const isPasswordValid = await passwordForm.trigger();
      if (!isPasswordValid) {
        setIsPending(false);
        return;
      }
      const passwordResult = await changePasswordAction({ currentPassword, newPassword });
      if (!passwordResult.success) {
        passwordForm.setError('currentPassword', { message: passwordResult.error });
        setIsPending(false);
        return;
      }
    }

    setIsPending(false);
    router.push('/profile');
  }

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'anonymous';

  return (
    <div className="p-6 md:p-12 space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-4xl md:text-5xl lowercase tracking-tight text-primary">
          settings
        </h1>
        <p className="text-on-surface-variant text-lg">
          Manage your athlete profile and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Profile block */}
        <section className="md:col-span-4 bg-surface-low rounded-2xl p-8 flex flex-col items-center text-center space-y-6">
          <AvatarUpload currentImage={image} onUploadSuccess={() => router.refresh()} />
          <div className="space-y-2">
            <p className="font-display text-xl text-on-surface">{displayName}</p>
            {email && <p className="text-sm text-on-surface-variant">{email}</p>}
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary-container/50 px-3 py-1.5 text-xs uppercase tracking-widest text-on-secondary-container ring-1 ring-outline-variant/15">
              <BadgeCheck size={14} aria-hidden="true" />
              Elite Member
            </div>
          </div>
        </section>

        {/* Personal Information */}
        <section className="md:col-span-8 bg-surface-low rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
            <User size={20} className="text-primary" aria-hidden="true" />
            <h2 className="font-display text-lg text-on-surface">Personal Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-widest text-on-surface-variant">
                First Name
              </label>
              <Input {...profileForm.register('firstName')} placeholder="Your first name" />
              {profileForm.formState.errors.firstName && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-widest text-on-surface-variant">
                Last Name
              </label>
              <Input {...profileForm.register('lastName')} placeholder="Your last name" />
              {profileForm.formState.errors.lastName && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.lastName.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs uppercase tracking-widest text-on-surface-variant">
                Username
              </label>
              <Input {...profileForm.register('username')} placeholder="your_username" />
              {profileForm.formState.errors.username && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.username.message}
                </p>
              )}
            </div>
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs uppercase tracking-widest text-on-surface-variant">
                Location
              </label>
              <Input
                {...profileForm.register('location')}
                placeholder="City, Country (optional)"
              />
              {profileForm.formState.errors.location && (
                <p className="text-sm text-destructive">
                  {profileForm.formState.errors.location.message}
                </p>
              )}
            </div>
          </div>
          {profileError && <p className="text-sm text-destructive">{profileError}</p>}
        </section>

        {/* Security */}
        {hasPassword && (
          <section className="md:col-span-12 bg-surface-low rounded-2xl p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
              <Lock size={20} className="text-primary" aria-hidden="true" />
              <h2 className="font-display text-lg text-on-surface">Security</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-widest text-on-surface-variant">
                  Current Password
                </label>
                <PasswordField
                  {...passwordForm.register('currentPassword')}
                  error={passwordForm.formState.errors.currentPassword?.message}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-widest text-on-surface-variant">
                  New Password
                </label>
                <PasswordField
                  {...passwordForm.register('newPassword')}
                  error={passwordForm.formState.errors.newPassword?.message}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-widest text-on-surface-variant">
                  Confirm Password
                </label>
                <PasswordField
                  {...passwordForm.register('confirmPassword')}
                  error={passwordForm.formState.errors.confirmPassword?.message}
                />
              </div>
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          </section>
        )}

        {/* Actions */}
        <div className="md:col-span-12 flex justify-end gap-4">
          <button
            type="button"
            onClick={handleDiscard}
            className="px-8 py-3 font-display font-bold lowercase text-primary border border-outline-variant/20 rounded-lg hover:bg-surface-container transition-colors"
          >
            discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="kinetic-gradient cursor-pointer rounded-lg px-8 py-3 font-display text-sm font-semibold lowercase tracking-wide text-on-primary-container transition-transform duration-150 active:scale-95 disabled:opacity-50"
          >
            {isPending ? 'saving…' : 'save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/profile/components/SettingsForm.tsx
git commit -m "feat(profile): redesign SettingsForm with bento layout, firstName/lastName/username, unified save"
```

---

### Task 5: Update settings/page.tsx — new fields + email from session

**Files:**
- Modify: `src/app/(main)/profile/settings/page.tsx`

- [ ] **Step 1: Replace settings/page.tsx**

```tsx
import { getProfileUserAction } from '@/features/profile/actions';
import SettingsForm from '@/features/profile/components/SettingsForm';
import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

export default async function SettingsPage() {
  const [session, user] = await Promise.all([auth(), getProfileUserAction()]);

  const userId = session?.user?.id;
  const passwordRecord = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { password: true } })
    : null;

  return (
    <SettingsForm
      firstName={user?.firstName ?? null}
      lastName={user?.lastName ?? null}
      username={user?.username ?? null}
      image={user?.image ?? null}
      location={user?.location ?? null}
      email={session?.user?.email ?? null}
      hasPassword={!!passwordRecord?.password}
    />
  );
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(main)/profile/settings/page.tsx
git commit -m "feat(profile): update settings page to pass firstName/lastName/username/email to SettingsForm"
```

---

### Task 6: Update SettingsForm.test.tsx — rewrite schema tests + new behavioural tests

**Files:**
- Modify: `src/features/profile/components/SettingsForm.test.tsx`

- [ ] **Step 1: Replace SettingsForm.test.tsx**

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('next-auth', () => ({ default: vi.fn(), getServerSession: vi.fn() }));
vi.mock('@/shared/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/shared/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/shared/lib/cloudinary', () => ({
  cloudinary: { uploader: { upload_stream: vi.fn() } },
}));
vi.mock('../actions', () => ({
  updateProfileAction: vi.fn(),
  changePasswordAction: vi.fn(),
  uploadAvatarAction: vi.fn(),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn(), push: mockPush })),
}));

import { profileSchema, changePasswordSchema } from './SettingsForm';

describe('profileSchema', () => {
  it('accepts all optional fields empty', () => {
    const result = profileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid firstName and lastName', () => {
    const result = profileSchema.safeParse({ firstName: 'Alice', lastName: 'Pole' });
    expect(result.success).toBe(true);
  });

  it('rejects firstName longer than 50 characters', () => {
    const result = profileSchema.safeParse({ firstName: 'A'.repeat(51) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('First name is too long');
  });

  it('accepts valid username with lowercase, numbers, underscores', () => {
    const result = profileSchema.safeParse({ username: 'alice_pole_42' });
    expect(result.success).toBe(true);
  });

  it('rejects username shorter than 2 characters', () => {
    const result = profileSchema.safeParse({ username: 'a' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Username must be at least 2 characters');
  });

  it('rejects username with uppercase letters', () => {
    const result = profileSchema.safeParse({ username: 'Alice' });
    expect(result.success).toBe(false);
  });

  it('rejects username with spaces', () => {
    const result = profileSchema.safeParse({ username: 'alice pole' });
    expect(result.success).toBe(false);
  });

  it('accepts empty string username (treated as absent by submit handler)', () => {
    const result = profileSchema.safeParse({ username: '' });
    expect(result.success).toBe(true);
  });

  it('accepts valid location', () => {
    const result = profileSchema.safeParse({ location: 'Warsaw, PL' });
    expect(result.success).toBe(true);
  });

  it('rejects location longer than 100 characters', () => {
    const result = profileSchema.safeParse({ location: 'A'.repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  it('rejects password shorter than 8 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'current',
      newPassword: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when newPassword and confirmPassword do not match', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'current123',
      newPassword: 'newpassword123',
      confirmPassword: 'different123',
    });
    expect(result.success).toBe(false);
    const confirmError = result.error?.issues.find((i) => i.path.includes('confirmPassword'));
    expect(confirmError?.message).toBe('Passwords do not match');
  });

  it('accepts valid matching passwords', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'current123',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run src/features/profile/components/SettingsForm.test.tsx
```

Expected: all tests pass.

- [ ] **Step 3: Run full suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/profile/components/SettingsForm.test.tsx
git commit -m "test(profile): rewrite SettingsForm schema tests for new firstName/lastName/username fields"
```

---

### Task 7: Tech debt entry + manual e2e cases

**Files:**
- Modify: `docs/todos.md`

- [ ] **Step 1: Add Preferences tech debt to docs/todos.md**

Under the `## Feature Gaps` section, add after the Elite Member badge entry:

```markdown
**Profile Settings — Preferences section skipped** (2026-04-24)

- Stitch design includes "High-Contrast Videos" and "Autoplay Tutorials" toggles — not implemented
- Needs: `preferences` JSON field on User model (or separate PreferenceKey table), toggle UI, server action
- Deferred until feature requirements are defined
```

- [ ] **Step 2: Run full test suite one last time**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual e2e cases**

Present to user for verification before merge:

**Positive:**
1. `/profile` — Hero shows `firstName lastName` (or whichever is set), falls back to `anonymous`
2. `/profile/settings` — Profile block shows displayName, email, Elite Member badge, AvatarUpload
3. `/profile/settings` — Personal Information pre-filled with existing firstName, lastName, username, location
4. Fill firstName + lastName, click Save Changes → redirected to `/profile`, Hero shows updated name
5. Fill valid username `alice_pole`, Save Changes → saved, no error
6. Leave password fields empty, Save Changes → profile saved, password unchanged, redirected to `/profile`
7. Fill all password fields correctly, Save Changes → password changed + redirect
8. Click Discard → both forms reset, redirected to `/profile`
9. OAuth user (no password) → Security section not shown

**Negative:**
10. Username with spaces or uppercase → inline validation error, no save
11. Duplicate username → "Username already taken" shown under username field
12. Password fields partially filled (e.g. only currentPassword) → validation errors shown, no save
13. New password + confirm don't match → "Passwords do not match" error
14. firstName longer than 50 chars → "First name is too long" error

- [ ] **Step 5: Commit**

```bash
git add docs/todos.md
git commit -m "docs: add Preferences section tech debt; settings redesign complete"
```
