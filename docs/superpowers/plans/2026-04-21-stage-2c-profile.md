# Stage 2C — Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/profile/*` section — multi-route dashboard with aside navigation, progress tracking, favourites scaffold, and profile settings (name, avatar, password).

**Architecture:** Next.js App Router nested routes under `(main)/profile/` with a shared `layout.tsx` that renders `ProfileAside` + `{children}` using `PageShell`. Each sub-page is a Server Component that fetches its own data. Interactive pieces (status picker, settings form, avatar upload) are Client Components.

**Tech Stack:** Next.js 16 App Router, Prisma 7, NextAuth v5 JWT, Cloudinary v2, React Hook Form 7 + Zod 4, shadcn/ui Button + Input (manual install), Tailwind CSS v4, Vitest + RTL

> **⚠️ Before starting:** Check `node_modules/next/dist/docs/` for any Next.js 16 API changes relevant to layouts and server actions.
>
> **Note on shadcn primitives:** This branch (`feature/stage-2c-profile`) does not yet have shadcn UI components — `feature/filters-accordion` has them but is not merged. Task 1 adds the required subset (Button, Input, `cn()`). If `filters-accordion` has been merged before you start, skip Task 1.

---

## File Map

**Created:**
- `src/shared/lib/utils.ts` — `cn()` helper
- `src/shared/components/ui/button.tsx` — shadcn Button
- `src/shared/components/ui/input.tsx` — shadcn Input
- `src/features/profile/components/ProfileAside.tsx` — aside nav (Client)
- `src/features/profile/components/ProfileOverview.tsx` — widget grid (Server)
- `src/features/profile/components/ProgressWidget.tsx` — IN_PROGRESS preview (Server)
- `src/features/profile/components/FavouritesWidget.tsx` — empty state (Server)
- `src/features/profile/components/ProgressStatusPicker.tsx` — status buttons (Client)
- `src/features/profile/components/ProgressCard.tsx` — move + status picker (Client)
- `src/features/profile/components/SettingsForm.tsx` — RHF + Zod settings (Client)
- `src/features/profile/components/AvatarUpload.tsx` — Cloudinary upload (Client)
- `src/app/(main)/profile/layout.tsx` — profile layout with aside
- `src/app/(main)/profile/progress/page.tsx` — full progress list
- `src/app/(main)/profile/favourite-moves/page.tsx` — favourites (empty state in 2C)
- `src/app/(main)/profile/settings/page.tsx` — settings page

**Modified:**
- `prisma/schema.prisma` — add `UserFavourite` model + relations
- `src/app/globals.css` — add shadcn token layer + `tw-animate-css` import
- `src/features/profile/actions.ts` — add 6 new actions
- `src/features/profile/types.ts` — add `FavouriteWithMove`, `ProfileFormValues`, `ChangePasswordValues`
- `src/features/profile/index.ts` — export new actions and types
- `src/app/(main)/profile/page.tsx` — replace stub with `ProfileOverview`

---

## Task 1: Add shadcn UI primitives

> Skip this task if `feature/filters-accordion` is already merged into this branch.

**Files:**
- Create: `src/shared/lib/utils.ts`
- Create: `src/shared/components/ui/button.tsx`
- Create: `src/shared/components/ui/input.tsx`
- Modify: `src/app/globals.css`
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install peer dependencies**

Run from `.worktrees/stage-2c-profile/`:
```bash
npm install --save-exact @radix-ui/react-slot@1.2.3 class-variance-authority@0.7.1 clsx@2.1.1 tailwind-merge@3.3.1 lucide-react@0.544.0 tw-animate-css@1.4.0
```

- [ ] **Step 2: Create `src/shared/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create `src/shared/components/ui/button.tsx`**

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline: 'border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

- [ ] **Step 4: Create `src/shared/components/ui/input.tsx`**

```tsx
import * as React from 'react';
import { cn } from '@/shared/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
```

- [ ] **Step 5: Add shadcn token layer to `src/app/globals.css`**

Replace the entire file content with:
```css
@import 'tailwindcss';
@import 'tw-animate-css';

:root {
  /* Stitch design system tokens */
  --surface: #131313;
  --surface-container-lowest: #0e0e0e;
  --surface-container-low: #1b1b1b;
  --surface-container: #1f1f1f;
  --surface-container-high: #2a2a2a;
  --surface-container-highest: #353535;
  --on-surface: #e2e2e2;
  --on-surface-variant: #cdc3d2;
  --primary: #dcb8ff;
  --primary-container: #8458b3;
  --secondary-container: #52416c;
  --on-secondary-container: #c5afe2;
  --outline: #978e9b;
  --outline-variant: #4b4450;

  /* shadcn compatibility layer — maps to Stitch tokens */
  --background: var(--surface);
  --foreground: var(--on-surface);
  --card: var(--surface-container);
  --card-foreground: var(--on-surface);
  --popover: var(--surface-container);
  --popover-foreground: var(--on-surface);
  --primary-foreground: var(--surface);
  --secondary: var(--secondary-container);
  --secondary-foreground: var(--on-secondary-container);
  --muted: var(--surface-container);
  --muted-foreground: var(--on-surface-variant);
  --accent: var(--surface-container-high);
  --accent-foreground: var(--on-surface);
  --destructive: #b3261e;
  --destructive-foreground: #ffffff;
  --border: var(--outline-variant);
  --input: var(--outline-variant);
  --ring: var(--primary);
  --radius: 0.5rem;
}

@theme inline {
  /* Stitch tokens */
  --color-surface: var(--surface);
  --color-surface-lowest: var(--surface-container-lowest);
  --color-surface-low: var(--surface-container-low);
  --color-surface-container: var(--surface-container);
  --color-surface-high: var(--surface-container-high);
  --color-surface-highest: var(--surface-container-highest);
  --color-on-surface: var(--on-surface);
  --color-on-surface-variant: var(--on-surface-variant);
  --color-primary: var(--primary);
  --color-primary-container: var(--primary-container);
  --color-secondary-container: var(--secondary-container);
  --color-on-secondary-container: var(--on-secondary-container);
  --color-outline: var(--outline);
  --color-outline-variant: var(--outline-variant);
  --font-sans: var(--font-manrope);
  --font-display: var(--font-space-grotesk);

  /* shadcn tokens */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@utility font-display {
  font-family: var(--font-display);
}

body {
  background-color: var(--surface);
  color: var(--on-surface);
  font-family: var(--font-manrope), Arial, sans-serif;
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/shared/lib/utils.ts src/shared/components/ui/button.tsx src/shared/components/ui/input.tsx src/app/globals.css package.json package-lock.json
git commit -m "chore(ui): add shadcn primitives (Button, Input, cn) and token layer"
```

---

## Task 2: Prisma — UserFavourite model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add UserFavourite model to `prisma/schema.prisma`**

Add to the end of the file (after `UserProgress` model):
```prisma
model UserFavourite {
  id        String   @id @default(cuid())
  userId    String
  moveId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  move Move @relation(fields: [moveId], references: [id], onDelete: Cascade)

  @@unique([userId, moveId])
}
```

Also add `favourites UserFavourite[]` to the `User` model (after the `progress` field) and to the `Move` model (after the `progress` field):
```prisma
// in User model, after: progress UserProgress[]
favourites UserFavourite[]

// in Move model, after: progress UserProgress[]
favourites UserFavourite[]
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add-user-favourite
```
Expected: migration file created, DB updated successfully

- [ ] **Step 3: Verify Prisma client regenerated**

```bash
npx prisma generate
```
Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add UserFavourite model with cascade deletes"
```

---

## Task 3: Profile types + new actions (TDD)

**Files:**
- Modify: `src/features/profile/types.ts`
- Modify: `src/features/profile/actions.ts`
- Modify: `src/features/profile/actions.test.ts`
- Modify: `src/features/profile/index.ts`

- [ ] **Step 1: Update `src/features/profile/types.ts`**

```ts
import type { UserProgress, UserFavourite, Move } from '@prisma/client';

export type ProgressWithMove = UserProgress & { move: Move };
export type FavouriteWithMove = UserFavourite & { move: Move };

export interface ProfileFormValues {
  name: string;
}

export interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
```

- [ ] **Step 2: Write failing tests for new actions in `src/features/profile/actions.test.ts`**

Replace the file with:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    userProgress: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    userFavourite: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/shared/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock('@/shared/lib/cloudinary', () => ({
  cloudinary: {
    uploader: {
      upload_stream: vi.fn(),
    },
  },
}));

import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';
import bcrypt from 'bcryptjs';
import { cloudinary } from '@/shared/lib/cloudinary';

import {
  getUserProgressAction,
  updateProgressAction,
  updateProfileAction,
  changePasswordAction,
  uploadAvatarAction,
  addFavouriteAction,
  removeFavouriteAction,
  getUserFavouritesAction,
} from './actions';

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.userProgress.findMany as ReturnType<typeof vi.fn>;
const mockUpsert = prisma.userProgress.upsert as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockUserUpdate = prisma.user.update as ReturnType<typeof vi.fn>;
const mockFavouriteUpsert = prisma.userFavourite.upsert as ReturnType<typeof vi.fn>;
const mockFavouriteDeleteMany = prisma.userFavourite.deleteMany as ReturnType<typeof vi.fn>;
const mockFavouriteFindMany = prisma.userFavourite.findMany as ReturnType<typeof vi.fn>;
const mockBcryptCompare = bcrypt.compare as ReturnType<typeof vi.fn>;
const mockBcryptHash = bcrypt.hash as ReturnType<typeof vi.fn>;
const mockUploadStream = cloudinary.uploader.upload_stream as ReturnType<typeof vi.fn>;

const session = { user: { id: 'user-123' } };

beforeEach(() => vi.clearAllMocks());

describe('getUserProgressAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getUserProgressAction()).rejects.toThrow('Unauthorized');
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('returns progress for the authenticated user', async () => {
    mockAuth.mockResolvedValue(session);
    mockFindMany.mockResolvedValue([{ id: 'progress-1' }]);
    const result = await getUserProgressAction();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-123' } }),
    );
    expect(result).toEqual([{ id: 'progress-1' }]);
  });
});

describe('updateProgressAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(updateProgressAction('move-1', 'IN_PROGRESS')).rejects.toThrow('Unauthorized');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('upserts progress using session userId', async () => {
    mockAuth.mockResolvedValue(session);
    mockUpsert.mockResolvedValue({ id: 'progress-1' });
    const result = await updateProgressAction('move-1', 'IN_PROGRESS');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_moveId: { userId: 'user-123', moveId: 'move-1' } },
        create: expect.objectContaining({
          userId: 'user-123',
          moveId: 'move-1',
          status: 'IN_PROGRESS',
        }),
      }),
    );
    expect(result).toEqual({ id: 'progress-1' });
  });
});

describe('updateProfileAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(updateProfileAction({ name: 'Alice' })).rejects.toThrow('Unauthorized');
  });

  it('returns error for invalid name (too short)', async () => {
    mockAuth.mockResolvedValue(session);
    const result = await updateProfileAction({ name: 'A' });
    expect(result).toEqual({ success: false, error: 'Invalid input' });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('updates user name and returns success', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserUpdate.mockResolvedValue({ id: 'user-123', name: 'Alice' });
    const result = await updateProfileAction({ name: 'Alice' });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { name: 'Alice' },
    });
    expect(result).toEqual({ success: true });
  });
});

describe('changePasswordAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(
      changePasswordAction({ currentPassword: 'old', newPassword: 'newpassword123' }),
    ).rejects.toThrow('Unauthorized');
  });

  it('returns error when user has no password (OAuth account)', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserFindUnique.mockResolvedValue({ id: 'user-123', password: null });
    const result = await changePasswordAction({
      currentPassword: 'old',
      newPassword: 'newpassword123',
    });
    expect(result).toEqual({ success: false, error: 'Password change is not available' });
    expect(mockBcryptCompare).not.toHaveBeenCalled();
  });

  it('returns error when current password is incorrect', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserFindUnique.mockResolvedValue({ id: 'user-123', password: 'hashed' });
    mockBcryptCompare.mockResolvedValue(false);
    const result = await changePasswordAction({
      currentPassword: 'wrong',
      newPassword: 'newpassword123',
    });
    expect(result).toEqual({ success: false, error: 'Current password is incorrect' });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('updates password and returns success when current password is correct', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserFindUnique.mockResolvedValue({ id: 'user-123', password: 'hashed' });
    mockBcryptCompare.mockResolvedValue(true);
    mockBcryptHash.mockResolvedValue('newhashed');
    mockUserUpdate.mockResolvedValue({ id: 'user-123' });
    const result = await changePasswordAction({
      currentPassword: 'correct',
      newPassword: 'newpassword123',
    });
    expect(mockBcryptHash).toHaveBeenCalledWith('newpassword123', 10);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { password: 'newhashed' },
    });
    expect(result).toEqual({ success: true });
  });
});

describe('addFavouriteAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(addFavouriteAction('move-1')).rejects.toThrow('Unauthorized');
  });

  it('upserts favourite and returns success (idempotent)', async () => {
    mockAuth.mockResolvedValue(session);
    mockFavouriteUpsert.mockResolvedValue({ id: 'fav-1' });
    const result = await addFavouriteAction('move-1');
    expect(mockFavouriteUpsert).toHaveBeenCalledWith({
      where: { userId_moveId: { userId: 'user-123', moveId: 'move-1' } },
      create: { userId: 'user-123', moveId: 'move-1' },
      update: {},
    });
    expect(result).toEqual({ success: true });
  });
});

describe('removeFavouriteAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(removeFavouriteAction('move-1')).rejects.toThrow('Unauthorized');
  });

  it('deletes favourite and returns success', async () => {
    mockAuth.mockResolvedValue(session);
    mockFavouriteDeleteMany.mockResolvedValue({ count: 1 });
    const result = await removeFavouriteAction('move-1');
    expect(mockFavouriteDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', moveId: 'move-1' },
    });
    expect(result).toEqual({ success: true });
  });
});

describe('getUserFavouritesAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getUserFavouritesAction()).rejects.toThrow('Unauthorized');
  });

  it('returns favourites with move for the authenticated user', async () => {
    mockAuth.mockResolvedValue(session);
    mockFavouriteFindMany.mockResolvedValue([{ id: 'fav-1', move: { title: 'Spin' } }]);
    const result = await getUserFavouritesAction();
    expect(mockFavouriteFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-123' },
        include: { move: true },
      }),
    );
    expect(result).toEqual([{ id: 'fav-1', move: { title: 'Spin' } }]);
  });
});
```

- [ ] **Step 3: Run tests — expect failures**

```bash
npx vitest run src/features/profile/actions.test.ts
```
Expected: FAIL — new actions not yet exported

- [ ] **Step 4: Implement new actions in `src/features/profile/actions.ts`**

Replace the file content with:
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

const profileNameSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export async function getUserProgressAction(): Promise<ProgressWithMove[]> {
  const userId = await requireAuth();
  return prisma.userProgress.findMany({
    where: { userId },
    include: { move: true },
  });
}

export async function updateProgressAction(moveId: string, status: LearnStatus) {
  const userId = await requireAuth();
  return prisma.userProgress.upsert({
    where: { userId_moveId: { userId, moveId } },
    create: { userId, moveId, status },
    update: { status },
  });
}

export async function updateProfileAction(data: { name: string }) {
  const userId = await requireAuth();
  const parsed = profileNameSchema.safeParse(data);
  if (!parsed.success) return { success: false as const, error: 'Invalid input' };
  await prisma.user.update({ where: { id: userId }, data: { name: parsed.data.name } });
  return { success: true as const };
}

export async function uploadAvatarAction(formData: FormData) {
  const userId = await requireAuth();
  const file = formData.get('avatar') as File | null;
  if (!file) return { success: false as const, error: 'No file provided' };
  if (!file.type.startsWith('image/'))
    return { success: false as const, error: 'Only image files are allowed' };
  if (file.size > 5 * 1024 * 1024)
    return { success: false as const, error: 'File size must be under 5MB' };

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: 'pole-dance-catalog/avatars', public_id: `user-${userId}`, overwrite: true },
        (error, res) => {
          if (error || !res) reject(error ?? new Error('Upload failed'));
          else resolve(res as { secure_url: string });
        },
      )
      .end(buffer);
  });

  await prisma.user.update({ where: { id: userId }, data: { image: result.secure_url } });
  return { success: true as const, imageUrl: result.secure_url };
}

export async function changePasswordAction(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const userId = await requireAuth();
  const parsed = changePasswordSchema.safeParse(data);
  if (!parsed.success) return { success: false as const, error: 'Invalid input' };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.password) return { success: false as const, error: 'Password change is not available' };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!valid) return { success: false as const, error: 'Current password is incorrect' };

  const hashed = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  return { success: true as const };
}

export async function addFavouriteAction(moveId: string) {
  const userId = await requireAuth();
  await prisma.userFavourite.upsert({
    where: { userId_moveId: { userId, moveId } },
    create: { userId, moveId },
    update: {},
  });
  return { success: true as const };
}

export async function removeFavouriteAction(moveId: string) {
  const userId = await requireAuth();
  await prisma.userFavourite.deleteMany({
    where: { userId, moveId },
  });
  return { success: true as const };
}

export async function getUserFavouritesAction(): Promise<FavouriteWithMove[]> {
  const userId = await requireAuth();
  return prisma.userFavourite.findMany({
    where: { userId },
    include: { move: true },
    orderBy: { createdAt: 'desc' },
  });
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run src/features/profile/actions.test.ts
```
Expected: all tests PASS

- [ ] **Step 6: Update `src/features/profile/index.ts`**

```ts
export {
  getUserProgressAction,
  updateProgressAction,
  updateProfileAction,
  uploadAvatarAction,
  changePasswordAction,
  addFavouriteAction,
  removeFavouriteAction,
  getUserFavouritesAction,
} from './actions';
export type { ProgressWithMove, FavouriteWithMove, ProfileFormValues, ChangePasswordValues } from './types';
```

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add src/features/profile/
git commit -m "feat(profile): add actions for profile update, password change, favourites"
```

---

## Task 4: Profile layout + ProfileAside

**Files:**
- Create: `src/features/profile/components/ProfileAside.tsx`
- Create: `src/app/(main)/profile/layout.tsx`

- [ ] **Step 1: Create `src/features/profile/components/ProfileAside.tsx`**

```tsx
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/profile', label: 'Overview' },
  { href: '/profile/progress', label: 'Progress' },
  { href: '/profile/favourite-moves', label: 'Favourite Moves' },
  { href: '/profile/settings', label: 'Settings' },
];

interface ProfileAsideProps {
  name: string | null;
  image: string | null;
}

export default function ProfileAside({ name, image }: ProfileAsideProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4">
      <div className="mb-6 flex items-center gap-3 px-2">
        {image ? (
          <Image
            src={image}
            alt={name ?? 'Avatar'}
            width={40}
            height={40}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container font-semibold text-on-surface">
            {name?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <span className="truncate font-display font-semibold text-on-surface">{name ?? 'User'}</span>
      </div>
      {NAV_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`rounded-md px-3 py-2 text-sm transition-colors ${
            pathname === href
              ? 'bg-primary-container font-medium text-on-surface'
              : 'text-on-surface-variant hover:bg-surface-high hover:text-on-surface'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Create `src/app/(main)/profile/layout.tsx`**

```tsx
import { auth } from '@/shared/lib/auth';
import ProfileAside from '@/features/profile/components/ProfileAside';
import PageShell from '@/shared/components/PageShell';

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <PageShell aside={<ProfileAside name={session?.user?.name ?? null} image={session?.user?.image ?? null} />}>
      {children}
    </PageShell>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/features/profile/components/ProfileAside.tsx src/app/(main)/profile/layout.tsx
git commit -m "feat(profile): add profile layout with aside navigation"
```

---

## Task 5: Overview page (widgets)

**Files:**
- Create: `src/features/profile/components/FavouritesWidget.tsx`
- Create: `src/features/profile/components/ProgressWidget.tsx`
- Create: `src/features/profile/components/ProfileOverview.tsx`
- Modify: `src/app/(main)/profile/page.tsx`

- [ ] **Step 1: Create `src/features/profile/components/FavouritesWidget.tsx`**

```tsx
import Link from 'next/link';

export default function FavouritesWidget() {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-surface-container p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-on-surface">Favourites</h2>
        <Link href="/profile/favourite-moves" className="text-sm text-primary hover:underline">
          View all →
        </Link>
      </div>
      <p className="text-sm text-on-surface-variant">
        Add favourites from individual move pages.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/features/profile/components/ProgressWidget.tsx`**

```tsx
import Link from 'next/link';
import { getUserProgressAction } from '../actions';

export default async function ProgressWidget() {
  const progress = await getUserProgressAction();
  const inProgress = progress.filter((p) => p.status === 'IN_PROGRESS').slice(0, 5);

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-surface-container p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-on-surface">In Progress</h2>
        <Link href="/profile/progress" className="text-sm text-primary hover:underline">
          View all →
        </Link>
      </div>
      {inProgress.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No moves in progress yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {inProgress.map((p) => (
            <li key={p.id} className="text-sm text-on-surface">
              {p.move.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/features/profile/components/ProfileOverview.tsx`**

```tsx
import FavouritesWidget from './FavouritesWidget';
import ProgressWidget from './ProgressWidget';

export default function ProfileOverview() {
  return (
    <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
      <ProgressWidget />
      <FavouritesWidget />
    </div>
  );
}
```

- [ ] **Step 4: Update `src/app/(main)/profile/page.tsx`**

```tsx
import ProfileOverview from '@/features/profile/components/ProfileOverview';

export default function ProfilePage() {
  return <ProfileOverview />;
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/features/profile/components/FavouritesWidget.tsx src/features/profile/components/ProgressWidget.tsx src/features/profile/components/ProfileOverview.tsx src/app/(main)/profile/page.tsx
git commit -m "feat(profile): add overview page with progress and favourites widgets"
```

---

## Task 6: Progress page (TDD for ProgressStatusPicker)

**Files:**
- Create: `src/features/profile/components/ProgressStatusPicker.tsx`
- Create: `src/features/profile/components/ProgressStatusPicker.test.tsx`
- Create: `src/features/profile/components/ProgressCard.tsx`
- Create: `src/app/(main)/profile/progress/page.tsx`

- [ ] **Step 1: Write failing tests for `ProgressStatusPicker`**

Create `src/features/profile/components/ProgressStatusPicker.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgressStatusPicker from './ProgressStatusPicker';

describe('ProgressStatusPicker', () => {
  it('renders three status buttons', () => {
    render(
      <ProgressStatusPicker
        currentStatus="WANT_TO_LEARN"
        onStatusChange={vi.fn()}
        isPending={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Want to Learn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In Progress' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Learned' })).toBeInTheDocument();
  });

  it('disables the currently active status button', () => {
    render(
      <ProgressStatusPicker
        currentStatus="IN_PROGRESS"
        onStatusChange={vi.fn()}
        isPending={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'In Progress' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Want to Learn' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Learned' })).not.toBeDisabled();
  });

  it('calls onStatusChange with correct value when an inactive button is clicked', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(
      <ProgressStatusPicker
        currentStatus="WANT_TO_LEARN"
        onStatusChange={onStatusChange}
        isPending={false}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Learned' }));
    expect(onStatusChange).toHaveBeenCalledWith('LEARNED');
  });

  it('disables all buttons when isPending is true', () => {
    render(
      <ProgressStatusPicker
        currentStatus="WANT_TO_LEARN"
        onStatusChange={vi.fn()}
        isPending={true}
      />,
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run src/features/profile/components/ProgressStatusPicker.test.tsx
```
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/features/profile/components/ProgressStatusPicker.tsx`**

```tsx
'use client';
import { Button } from '@/shared/components/ui/button';
import type { LearnStatus } from '@/shared/types';

const STATUSES: { value: LearnStatus; label: string }[] = [
  { value: 'WANT_TO_LEARN', label: 'Want to Learn' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'LEARNED', label: 'Learned' },
];

interface ProgressStatusPickerProps {
  currentStatus: LearnStatus;
  onStatusChange: (status: LearnStatus) => void;
  isPending: boolean;
}

export default function ProgressStatusPicker({
  currentStatus,
  onStatusChange,
  isPending,
}: ProgressStatusPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map(({ value, label }) => (
        <Button
          key={value}
          size="sm"
          variant={currentStatus === value ? 'default' : 'ghost'}
          onClick={() => onStatusChange(value)}
          disabled={isPending || currentStatus === value}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/features/profile/components/ProgressStatusPicker.test.tsx
```
Expected: all 4 tests PASS

- [ ] **Step 5: Create `src/features/profile/components/ProgressCard.tsx`**

```tsx
'use client';
import Image from 'next/image';
import { useTransition } from 'react';
import { ImageOff } from 'lucide-react';

import { updateProgressAction } from '../actions';
import type { ProgressWithMove } from '../types';
import type { LearnStatus } from '@/shared/types';
import ProgressStatusPicker from './ProgressStatusPicker';

const DIFFICULTY_BADGE: Record<string, { className: string; style?: React.CSSProperties }> = {
  BEGINNER: { className: 'bg-secondary-container text-on-secondary-container' },
  INTERMEDIATE: { className: 'bg-primary-container text-on-surface' },
  ADVANCED: { className: '', style: { backgroundColor: '#92400e', color: '#fef3c7' } },
};

export default function ProgressCard({ item }: { item: ProgressWithMove }) {
  const [isPending, startTransition] = useTransition();
  const badge = DIFFICULTY_BADGE[item.move.difficulty] ?? DIFFICULTY_BADGE.BEGINNER;

  function handleStatusChange(status: LearnStatus) {
    startTransition(async () => {
      await updateProgressAction(item.move.id, status);
    });
  }

  return (
    <div className="flex gap-4 rounded-xl bg-surface-container p-4">
      <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-accent">
        {item.move.imageUrl ? (
          <Image src={item.move.imageUrl} alt={item.move.title} fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff className="h-6 w-6 text-on-surface-variant" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
            style={badge.style}
          >
            {item.move.difficulty}
          </span>
          <h3 className="font-display font-semibold text-on-surface">{item.move.title}</h3>
        </div>
        <ProgressStatusPicker
          currentStatus={item.status}
          onStatusChange={handleStatusChange}
          isPending={isPending}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create `src/app/(main)/profile/progress/page.tsx`**

```tsx
import { getUserProgressAction } from '@/features/profile';
import ProgressCard from '@/features/profile/components/ProgressCard';

export default async function ProgressPage() {
  const progress = await getUserProgressAction();

  if (progress.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-on-surface-variant">No moves tracked yet.</p>
        <p className="mt-1 text-sm text-on-surface-variant">
          Browse the catalog to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-6">
      <h1 className="font-display text-xl font-semibold text-on-surface">Progress</h1>
      <div className="flex flex-col gap-3">
        {progress.map((item) => (
          <ProgressCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run all tests**

```bash
npx vitest run
```
Expected: all tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/features/profile/components/ProgressStatusPicker.tsx src/features/profile/components/ProgressStatusPicker.test.tsx src/features/profile/components/ProgressCard.tsx src/app/(main)/profile/progress/
git commit -m "feat(profile): add progress page with status picker and move cards"
```

---

## Task 7: Favourite moves page

**Files:**
- Create: `src/app/(main)/profile/favourite-moves/page.tsx`

- [ ] **Step 1: Create `src/app/(main)/profile/favourite-moves/page.tsx`**

```tsx
import { getUserFavouritesAction } from '@/features/profile';

export default async function FavouriteMovesPage() {
  const favourites = await getUserFavouritesAction();

  if (favourites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-on-surface-variant">No favourites yet.</p>
        <p className="mt-1 text-sm text-on-surface-variant">
          Open any move page and tap the heart icon to add it here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-6">
      <h1 className="font-display text-xl font-semibold text-on-surface">Favourite Moves</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {favourites.map((fav) => (
          <div key={fav.id} className="rounded-xl bg-surface-container p-4">
            <p className="font-display font-semibold text-on-surface">{fav.move.title}</p>
            <p className="text-sm text-on-surface-variant">{fav.move.difficulty}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

> Note: This page renders a basic card without a remove button in Stage 2C. Full interactivity (remove from favourites, rich card) comes in Stage 2D alongside the Move Detail page.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```
Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/(main)/profile/favourite-moves/
git commit -m "feat(profile): add favourite-moves page (empty state for Stage 2C)"
```

---

## Task 8: Settings page (TDD for SettingsForm validation)

**Files:**
- Create: `src/features/profile/components/AvatarUpload.tsx`
- Create: `src/features/profile/components/SettingsForm.tsx`
- Create: `src/features/profile/components/SettingsForm.test.tsx`
- Create: `src/app/(main)/profile/settings/page.tsx`

- [ ] **Step 1: Write failing tests for `SettingsForm` Zod validation**

Create `src/features/profile/components/SettingsForm.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { profileNameSchema, changePasswordSchema } from './SettingsForm';

describe('profileNameSchema', () => {
  it('rejects empty name', () => {
    const result = profileNameSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name shorter than 2 characters', () => {
    const result = profileNameSchema.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Name must be at least 2 characters');
  });

  it('rejects name longer than 50 characters', () => {
    const result = profileNameSchema.safeParse({ name: 'A'.repeat(51) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Name is too long');
  });

  it('accepts a valid name', () => {
    const result = profileNameSchema.safeParse({ name: 'Alice' });
    expect(result.success).toBe(true);
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

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run src/features/profile/components/SettingsForm.test.tsx
```
Expected: FAIL — module not found

- [ ] **Step 3: Create `src/features/profile/components/AvatarUpload.tsx`**

```tsx
'use client';
import Image from 'next/image';
import { useRef, useState } from 'react';

import { uploadAvatarAction } from '../actions';
import { Button } from '@/shared/components/ui/button';

interface AvatarUploadProps {
  currentImage: string | null;
  onUploadSuccess: (imageUrl: string) => void;
}

export default function AvatarUpload({ currentImage, onUploadSuccess }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5MB');
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
  }

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setIsPending(true);
    setError(null);
    const formData = new FormData();
    formData.append('avatar', file);
    const result = await uploadAvatarAction(formData);
    setIsPending(false);
    if (!result.success) {
      setError(result.error ?? 'Upload failed');
    } else {
      onUploadSuccess(result.imageUrl);
      setPreview(null);
    }
  }

  const displayImage = preview ?? currentImage;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-20 w-20 overflow-hidden rounded-full bg-surface-high">
        {displayImage ? (
          <Image src={displayImage} alt="Avatar" fill className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-on-surface-variant text-xs">
            No photo
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          Choose photo
        </Button>
        {preview && (
          <Button type="button" size="sm" onClick={handleUpload} disabled={isPending}>
            {isPending ? 'Uploading…' : 'Upload'}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/features/profile/components/SettingsForm.tsx`**

```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { updateProfileAction, changePasswordAction } from '../actions';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import AvatarUpload from './AvatarUpload';

export const profileNameSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
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

type ProfileNameValues = z.infer<typeof profileNameSchema>;
type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

interface SettingsFormProps {
  name: string | null;
  image: string | null;
  hasPassword: boolean;
}

export default function SettingsForm({ name, image, hasPassword }: SettingsFormProps) {
  const router = useRouter();
  const [nameSuccess, setNameSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const nameForm = useForm<ProfileNameValues>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: { name: name ?? '' },
  });

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function handleNameSubmit(values: ProfileNameValues) {
    setNameSuccess(false);
    const result = await updateProfileAction(values);
    if (!result.success) {
      nameForm.setError('name', { message: result.error });
    } else {
      setNameSuccess(true);
      router.refresh();
    }
  }

  async function handlePasswordSubmit(values: ChangePasswordFormValues) {
    setPasswordSuccess(false);
    const result = await changePasswordAction({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
    if (!result.success) {
      passwordForm.setError('currentPassword', { message: result.error });
    } else {
      setPasswordSuccess(true);
      passwordForm.reset();
    }
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      <h1 className="font-display text-xl font-semibold text-on-surface">Settings</h1>

      {/* Avatar section */}
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-on-surface">Profile photo</h2>
        <AvatarUpload
          currentImage={image}
          onUploadSuccess={() => router.refresh()}
        />
      </section>

      {/* Name section */}
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-on-surface">Display name</h2>
        <form onSubmit={nameForm.handleSubmit(handleNameSubmit)} className="flex flex-col gap-3 max-w-sm">
          <div className="flex flex-col gap-1">
            <Input
              {...nameForm.register('name')}
              placeholder="Your name"
              aria-label="Display name"
            />
            {nameForm.formState.errors.name && (
              <p className="text-sm text-destructive">{nameForm.formState.errors.name.message}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={nameForm.formState.isSubmitting}>
              {nameForm.formState.isSubmitting ? 'Saving…' : 'Save name'}
            </Button>
            {nameSuccess && <p className="text-sm text-primary">Name updated!</p>}
          </div>
        </form>
      </section>

      {/* Password section — only for credential accounts */}
      {hasPassword && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-on-surface">Change password</h2>
          <form
            onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}
            className="flex flex-col gap-3 max-w-sm"
          >
            <div className="flex flex-col gap-1">
              <Input
                {...passwordForm.register('currentPassword')}
                type="password"
                placeholder="Current password"
                aria-label="Current password"
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Input
                {...passwordForm.register('newPassword')}
                type="password"
                placeholder="New password"
                aria-label="New password"
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Input
                {...passwordForm.register('confirmPassword')}
                type="password"
                placeholder="Confirm new password"
                aria-label="Confirm new password"
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                {passwordForm.formState.isSubmitting ? 'Saving…' : 'Change password'}
              </Button>
              {passwordSuccess && <p className="text-sm text-primary">Password updated!</p>}
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
npx vitest run src/features/profile/components/SettingsForm.test.tsx
```
Expected: all 7 tests PASS

- [ ] **Step 6: Create `src/app/(main)/profile/settings/page.tsx`**

```tsx
import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';
import SettingsForm from '@/features/profile/components/SettingsForm';

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { name: true, image: true, password: true } })
    : null;

  return (
    <SettingsForm
      name={user?.name ?? null}
      image={user?.image ?? null}
      hasPassword={user?.password !== null && user?.password !== undefined}
    />
  );
}
```

- [ ] **Step 7: Run all tests**

```bash
npx vitest run
```
Expected: all tests PASS

- [ ] **Step 8: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/features/profile/components/AvatarUpload.tsx src/features/profile/components/SettingsForm.tsx src/features/profile/components/SettingsForm.test.tsx src/app/(main)/profile/settings/
git commit -m "feat(profile): add settings page with name, avatar, and password sections"
```

---

## Final check

- [ ] **Run full test suite**

```bash
npx vitest run
```
Expected: all tests PASS (existing 140 + new tests)

- [ ] **TypeScript clean**

```bash
npx tsc --noEmit
```
Expected: no errors
