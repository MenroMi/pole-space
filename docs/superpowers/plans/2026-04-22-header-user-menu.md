# Header User Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static account icon link in the Header with an interactive Radix-powered dropdown menu that shows contextual options for authenticated and unauthenticated users.

**Architecture:** `Header` (Server Component) fetches the session and passes `user | null` to `UserMenu` (Client Component). `UserMenu` renders a Radix `DropdownMenu` trigger; authenticated users see a header with avatar/name + active Profile/Settings/Log out, unauthenticated users see disabled Profile/Settings and an active Log in link. Log out opens a Radix `AlertDialog` confirmation. Both Radix primitives are wrapped manually in `src/shared/components/ui/` following the existing shadcn pattern.

**Tech Stack:** Next.js 16 App Router, NextAuth v5 JWT, `@radix-ui/react-dropdown-menu@2.1.16`, `@radix-ui/react-alert-dialog@1.1.15`, Tailwind CSS v4, Vitest + RTL

---

## File Map

**Created:**

- `src/shared/components/ui/dropdown-menu.tsx` — Radix DropdownMenu primitives with Stitch tokens
- `src/shared/components/ui/alert-dialog.tsx` — Radix AlertDialog primitives with Stitch tokens
- `src/shared/lib/auth-actions.ts` — `signOutAction` Server Action
- `src/shared/components/UserMenu.tsx` — Client Component, all dropdown/dialog logic
- `src/shared/components/UserMenu.test.tsx` — TDD tests for UserMenu

**Modified:**

- `src/shared/components/Header.tsx` — remove bare link, pass `user` prop to `UserMenu`
- `src/shared/components/Header.test.tsx` — update tests to match new structure

---

## Task 1: Install packages + UI primitives

**Files:**

- Modify: `package.json` (via npm install)
- Create: `src/shared/components/ui/dropdown-menu.tsx`
- Create: `src/shared/components/ui/alert-dialog.tsx`

- [ ] **Step 1: Install packages**

```bash
npm install --save-exact @radix-ui/react-dropdown-menu@2.1.16 @radix-ui/react-alert-dialog@1.1.15
```

Expected: packages added to `package.json` and `package-lock.json`.

- [ ] **Step 2: Create `src/shared/components/ui/dropdown-menu.tsx`**

```tsx
'use client';
import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/shared/lib/utils';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 8, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[10rem] overflow-hidden rounded-xl border border-outline-variant bg-surface-container p-1 shadow-lg',
        'data-[state=closed]:animate-out data-[state=open]:animate-in',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-on-surface transition-colors outline-none select-none',
      'focus:bg-accent focus:text-on-surface',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('flex items-center gap-3 px-3 py-2', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-outline-variant', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};
```

- [ ] **Step 3: Create `src/shared/components/ui/alert-dialog.tsx`**

```tsx
'use client';
import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/components/ui/button';

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60',
      'data-[state=closed]:animate-out data-[state=open]:animate-in',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2',
        'rounded-xl border border-outline-variant bg-surface-container p-6 shadow-lg',
        'data-[state=closed]:animate-out data-[state=open]:animate-in',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    />
  </AlertDialogPrimitive.Portal>
));
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-2', className)} {...props} />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex justify-end gap-3 pt-4', className)} {...props} />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn('font-display text-lg font-semibold text-on-surface', className)}
    {...props}
  />
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-on-surface-variant', className)}
    {...props}
  />
));
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(buttonVariants({ variant: 'outline' }), className)}
    {...props}
  />
));
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants({ variant: 'destructive' }), className)}
    {...props}
  />
));
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
};
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/ui/dropdown-menu.tsx src/shared/components/ui/alert-dialog.tsx package.json package-lock.json
git commit -m "chore(ui): add DropdownMenu and AlertDialog Radix primitives"
```

---

## Task 2: signOutAction

**Files:**

- Create: `src/shared/lib/auth-actions.ts`

- [ ] **Step 1: Create `src/shared/lib/auth-actions.ts`**

```ts
'use server';
import { signOut } from '@/shared/lib/auth';

export async function signOutAction() {
  await signOut({ redirectTo: '/' });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/auth-actions.ts
git commit -m "feat(auth): add signOutAction server action"
```

---

## Task 3: UserMenu (TDD)

**Files:**

- Create: `src/shared/components/UserMenu.test.tsx`
- Create: `src/shared/components/UserMenu.tsx`

- [ ] **Step 1: Write failing tests in `src/shared/components/UserMenu.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock('@/shared/lib/auth-actions', () => ({ signOutAction: vi.fn() }));

// Mock Radix primitives so tests don't depend on JSDOM portal/pointer quirks
vi.mock('@/shared/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    disabled,
    onSelect,
    className,
    asChild,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onSelect?: () => void;
    className?: string;
    asChild?: boolean;
  }) => (
    <div role="menuitem" aria-disabled={disabled} className={className} onClick={onSelect}>
      {children}
    </div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock('@/shared/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

import { signOutAction } from '@/shared/lib/auth-actions';
import UserMenu from './UserMenu';

const mockSignOut = signOutAction as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('UserMenu — unauthenticated (user=null)', () => {
  it('renders the account icon trigger', () => {
    render(<UserMenu user={null} />);
    expect(screen.getByRole('button', { name: /account menu/i })).toBeInTheDocument();
  });

  it('renders Profile and Settings as disabled', () => {
    render(<UserMenu user={null} />);
    expect(screen.getByRole('menuitem', { name: 'Profile' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('renders Log in as active (not disabled)', () => {
    render(<UserMenu user={null} />);
    const logIn = screen.getByRole('menuitem', { name: 'Log in' });
    expect(logIn).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('does not render Log out', () => {
    render(<UserMenu user={null} />);
    expect(screen.queryByRole('menuitem', { name: 'Log out' })).not.toBeInTheDocument();
  });
});

describe('UserMenu — authenticated (user provided)', () => {
  const user = { name: 'Alice', image: null };

  it('shows user name in the dropdown header', () => {
    render(<UserMenu user={user} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders Profile and Settings as active (not disabled)', () => {
    render(<UserMenu user={user} />);
    expect(screen.getByRole('menuitem', { name: 'Profile' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('menuitem', { name: 'Settings' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('renders Log out and not Log in', () => {
    render(<UserMenu user={user} />);
    expect(screen.getByRole('menuitem', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('shows avatar image when user has an image', () => {
    render(<UserMenu user={{ name: 'Alice', image: 'https://example.com/avatar.jpg' }} />);
    expect(screen.getByAltText('Alice')).toBeInTheDocument();
  });

  it('shows initial letter when user has no image', () => {
    render(<UserMenu user={user} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});

describe('UserMenu — Log out confirmation', () => {
  const user = { name: 'Alice', image: null };

  it('clicking Log out opens confirmation dialog', async () => {
    const u = userEvent.setup();
    render(<UserMenu user={user} />);
    await u.click(screen.getByRole('menuitem', { name: 'Log out' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Log out?')).toBeInTheDocument();
  });

  it('clicking Cancel closes the dialog without calling signOutAction', async () => {
    const u = userEvent.setup();
    render(<UserMenu user={user} />);
    await u.click(screen.getByRole('menuitem', { name: 'Log out' }));
    await u.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('clicking Log out in dialog calls signOutAction', async () => {
    const u = userEvent.setup();
    render(<UserMenu user={user} />);
    await u.click(screen.getByRole('menuitem', { name: 'Log out' }));
    await u.click(screen.getByRole('button', { name: 'Log out' }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests — expect failures**

```bash
npx vitest run src/shared/components/UserMenu.test.tsx --reporter=dot
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/shared/components/UserMenu.tsx`**

```tsx
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { signOutAction } from '@/shared/lib/auth-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

interface UserMenuProps {
  user: { name: string | null; image: string | null } | null;
}

const NAV_ITEMS = [
  { label: 'Profile', href: '/profile' },
  { label: 'Settings', href: '/profile/settings' },
];

export default function UserMenu({ user }: UserMenuProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {user && (
            <>
              <DropdownMenuLabel>
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? 'Avatar'}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-on-surface">
                    {user.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
                <span className="text-sm font-medium text-on-surface">{user.name ?? 'User'}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}

          {NAV_ITEMS.map(({ label, href }) =>
            user ? (
              <DropdownMenuItem key={href} asChild>
                <Link href={href}>{label}</Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={href} disabled>
                {label}
              </DropdownMenuItem>
            ),
          )}

          <DropdownMenuSeparator />

          {user ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setConfirmOpen(true)}
            >
              Log out
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild>
              <Link href="/login">Log in</Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need to sign back in to access your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => signOutAction()}>Log out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
npx vitest run src/shared/components/UserMenu.test.tsx --reporter=dot
```

Expected: all tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run --reporter=dot
```

Expected: all tests PASS.

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/UserMenu.tsx src/shared/components/UserMenu.test.tsx
git commit -m "feat(header): add UserMenu with dropdown and sign-out confirmation"
```

---

## Task 4: Update Header

**Files:**

- Modify: `src/shared/components/Header.tsx`
- Modify: `src/shared/components/Header.test.tsx`

- [ ] **Step 1: Update `src/shared/components/Header.tsx`**

Replace the entire file with:

```tsx
import Link from 'next/link';

import { auth } from '@/shared/lib/auth';
import HeaderNav from './HeaderNav';
import UserMenu from './UserMenu';

export default async function Header() {
  const session = await auth();
  const user = session?.user
    ? { name: session.user.name ?? null, image: session.user.image ?? null }
    : null;

  return (
    <header
      className="sticky top-0 z-50 flex h-16 items-center justify-between px-8 backdrop-blur-xl"
      style={{ backgroundColor: 'rgba(19, 19, 19, 0.8)' }}
    >
      <Link
        href="/"
        className="font-display text-lg font-semibold tracking-tight text-on-surface lowercase"
      >
        kinetic gallery
      </Link>

      <HeaderNav />

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Search"
          className="text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>

        <UserMenu user={user} />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update `src/shared/components/Header.test.tsx`**

Replace the entire file with:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { auth } from '@/shared/lib/auth';
import Header from './Header';

vi.mock('@/shared/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('./HeaderNav', () => ({ default: () => <nav data-testid="header-nav" /> }));
vi.mock('./UserMenu', () => ({
  default: ({ user }: { user: { name: string | null; image: string | null } | null }) => (
    <div data-testid="user-menu" data-user={JSON.stringify(user)} />
  ),
}));

const mockAuth = auth as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('Header', () => {
  it('renders wordmark linking to /', async () => {
    mockAuth.mockResolvedValue(null);
    render(await Header());
    expect(screen.getByRole('link', { name: /kinetic gallery/i })).toHaveAttribute('href', '/');
  });

  it('renders HeaderNav', async () => {
    mockAuth.mockResolvedValue(null);
    render(await Header());
    expect(screen.getByTestId('header-nav')).toBeInTheDocument();
  });

  it('passes null user to UserMenu when no session', async () => {
    mockAuth.mockResolvedValue(null);
    render(await Header());
    expect(screen.getByTestId('user-menu')).toHaveAttribute('data-user', 'null');
  });

  it('passes name and image to UserMenu when session exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', name: 'Alice', image: null, role: 'USER' } });
    render(await Header());
    expect(screen.getByTestId('user-menu')).toHaveAttribute(
      'data-user',
      JSON.stringify({ name: 'Alice', image: null }),
    );
  });

  it('passes null image when session user has no image', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', name: 'Bob', image: undefined, role: 'USER' } });
    render(await Header());
    expect(screen.getByTestId('user-menu')).toHaveAttribute(
      'data-user',
      JSON.stringify({ name: 'Bob', image: null }),
    );
  });
});
```

- [ ] **Step 3: Run tests — expect pass**

```bash
npx vitest run src/shared/components/Header.test.tsx --reporter=dot
```

Expected: all 5 tests PASS.

- [ ] **Step 4: Run full test suite**

```bash
npx vitest run --reporter=dot
```

Expected: all tests PASS.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/Header.tsx src/shared/components/Header.test.tsx
git commit -m "feat(header): replace account link with UserMenu dropdown"
```

---

## Final check

- [ ] **Run full test suite one last time**

```bash
npx vitest run --reporter=dot
```

Expected: all tests PASS (existing 156 + new UserMenu and Header tests).

- [ ] **TypeScript clean**

```bash
npx tsc --noEmit
```

Expected: no errors.
