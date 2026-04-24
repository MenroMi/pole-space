# Password Input UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a show/hide password eye toggle and Caps Lock warning to all password inputs in `LoginForm`, `SignupForm`, and `SettingsForm`.

**Architecture:** Two focused components share identical caps-lock + eye-toggle logic. `PasswordInput` (new shared component) replaces the `<input type="password">` blocks in auth forms — it preserves the existing bottom-border animation style. A private `PasswordField` (added inline in `SettingsForm.tsx`) wraps the shadcn `<Input>` for the change-password section. Both are `React.forwardRef` components so RHF `{...register(...)}` spreads directly onto them with no adapter.

**Tech Stack:** React 19, TypeScript, React Hook Form, Vitest + RTL (`@testing-library/react`, `@testing-library/user-event`), Tailwind v4, shadcn `<Input>` (`src/shared/components/ui/input.tsx`)

---

## File Map

| Action | Path                                               |
| ------ | -------------------------------------------------- |
| Create | `src/shared/components/PasswordInput.tsx`          |
| Create | `src/shared/components/PasswordInput.test.tsx`     |
| Modify | `src/features/auth/components/LoginForm.tsx`       |
| Modify | `src/features/auth/components/SignupForm.tsx`      |
| Modify | `src/features/profile/components/SettingsForm.tsx` |

---

### Task 1: `PasswordInput` — tests first (RED)

**Files:**

- Create: `src/shared/components/PasswordInput.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PasswordInput } from './PasswordInput';

function renderInput(props?: React.ComponentProps<typeof PasswordInput>) {
  render(
    <label>
      Password
      <PasswordInput placeholder="••••••••" {...props} />
    </label>,
  );
  return screen.getByPlaceholderText('••••••••') as HTMLInputElement;
}

describe('PasswordInput', () => {
  it('renders type="password" by default', () => {
    const input = renderInput();
    expect(input).toHaveAttribute('type', 'password');
  });

  it('eye button click changes type to "text"', async () => {
    const user = userEvent.setup();
    const input = renderInput();
    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(input).toHaveAttribute('type', 'text');
  });

  it('second eye button click changes type back to "password"', async () => {
    const user = userEvent.setup();
    const input = renderInput();
    await user.click(screen.getByRole('button', { name: /show password/i }));
    await user.click(screen.getByRole('button', { name: /hide password/i }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('eye button aria-label reflects visibility state', async () => {
    const user = userEvent.setup();
    renderInput();
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });

  it('shows caps lock warning after keydown with CapsLock active', () => {
    const input = renderInput();
    const event = new KeyboardEvent('keydown', { bubbles: true });
    Object.defineProperty(event, 'getModifierState', {
      value: (key: string) => key === 'CapsLock',
    });
    fireEvent(input, event);
    expect(screen.getByRole('status')).toHaveTextContent('caps lock is on');
  });

  it('does not show caps lock warning after keydown without CapsLock', () => {
    const input = renderInput();
    const event = new KeyboardEvent('keydown', { bubbles: true });
    Object.defineProperty(event, 'getModifierState', { value: () => false });
    fireEvent(input, event);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('hides caps lock warning on blur', () => {
    const input = renderInput();
    const keyEvent = new KeyboardEvent('keydown', { bubbles: true });
    Object.defineProperty(keyEvent, 'getModifierState', {
      value: (key: string) => key === 'CapsLock',
    });
    fireEvent(input, keyEvent);
    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.blur(input);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('calls props.onBlur on blur', () => {
    const onBlur = vi.fn();
    const input = renderInput({ onBlur });
    fireEvent.blur(input);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/shared/components/PasswordInput.test.tsx
```

Expected: all 8 tests fail with `Cannot find module './PasswordInput'`.

---

### Task 2: `PasswordInput` — implementation (GREEN)

**Files:**

- Create: `src/shared/components/PasswordInput.tsx`

- [ ] **Step 3: Create the component**

```tsx
'use client';
import React, { useState } from 'react';

export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ onKeyDown, onKeyUp, onBlur, className, ...props }, ref) => {
  const [show, setShow] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  return (
    <>
      <div className="relative">
        <input
          ref={ref}
          type={show ? 'text' : 'password'}
          className={`w-full border-b border-outline-variant bg-transparent px-0 py-3 pr-8 text-on-surface placeholder:text-outline-variant/40 focus:outline-none${className ? ` ${className}` : ''}`}
          onKeyDown={(e) => {
            setCapsLock(e.getModifierState('CapsLock'));
            onKeyDown?.(e);
          }}
          onKeyUp={(e) => {
            setCapsLock(e.getModifierState('CapsLock'));
            onKeyUp?.(e);
          }}
          onBlur={(e) => {
            setCapsLock(false);
            onBlur?.(e);
          }}
          {...props}
        />
        <div className="pointer-events-none absolute bottom-0 left-0 h-[1.5px] w-full origin-center scale-x-0 bg-primary transition-transform duration-300 group-focus-within:scale-x-100" />
        <button
          type="button"
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          onClick={() => setShow((s) => !s)}
          className="absolute top-1/2 right-0 -translate-y-1/2 text-outline-variant transition-colors hover:text-on-surface focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {capsLock && (
        <p role="status" className="mt-1.5 text-xs tracking-wide text-amber-400/80">
          caps lock is on
        </p>
      )}
    </>
  );
});
PasswordInput.displayName = 'PasswordInput';

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 8s2.667-5 7-5 7 5 7 5-2.667 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 2l12 12" />
      <path d="M6.5 6.5a2 2 0 002.83 2.83" />
      <path d="M4 4.3A8 8 0 001 8s2.667 5 7 5c1.1 0 2.1-.25 3-.7" />
      <path d="M12 11.7A8 8 0 0015 8s-2.667-5-7-5c-1.1 0-2.1.25-3 .7" />
    </svg>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/shared/components/PasswordInput.test.tsx
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/PasswordInput.tsx src/shared/components/PasswordInput.test.tsx
git commit -m "feat: add PasswordInput component with eye toggle and caps lock warning"
```

---

### Task 3: Wire `PasswordInput` into `LoginForm`

**Files:**

- Modify: `src/features/auth/components/LoginForm.tsx`

- [ ] **Step 6: Add the import and replace the password field block**

Add import at the top of `LoginForm.tsx` (after the existing imports):

```tsx
import { PasswordInput } from '@/shared/components/PasswordInput';
```

Replace the entire `{/* Password */}` section (lines 73–110 in the original file):

```tsx
{
  /* Password */
}
<div className="group">
  <div className="mb-1 flex items-end justify-between">
    <label
      htmlFor="password"
      className="block text-[10px] font-medium tracking-widest text-outline-variant uppercase transition-colors duration-200 group-focus-within:text-primary"
    >
      password
    </label>
    <Link
      href="/forgot-password"
      className="text-[10px] tracking-widest text-primary/60 uppercase transition-colors duration-200 hover:text-primary"
    >
      forgot?
    </Link>
  </div>
  <PasswordInput
    id="password"
    placeholder="••••••••"
    aria-describedby={errors.password ? 'password-error' : undefined}
    aria-invalid={!!errors.password}
    {...register('password')}
  />
  {errors.password && (
    <p id="password-error" role="alert" className="mt-1.5 text-xs tracking-wide text-red-400/80">
      {errors.password.message}
    </p>
  )}
</div>;
```

- [ ] **Step 7: Update `LoginForm.test.tsx` — fix ambiguous label query**

The eye button has `aria-label="Show password"`, which means `getByLabelText(/password/i)` now matches both the input and the button, causing RTL to throw. Replace every `screen.getByLabelText(/password/i)` in `LoginForm.test.tsx` with `screen.getByPlaceholderText('••••••••')`.

Result: `LoginForm.test.tsx` currently has 3 occurrences of `getByLabelText(/password/i)` — at lines 23, 46, and 55. Replace all three:

```tsx
// line 23 — existence check
expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();

// line 46 — typing interaction
await user.type(screen.getByPlaceholderText('••••••••'), 'password123');

// line 55 — typing interaction
await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
```

- [ ] **Step 8: Run LoginForm tests**

```bash
npx vitest run src/features/auth/components/LoginForm.test.tsx
```

Expected: all 5 tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/features/auth/components/LoginForm.tsx src/features/auth/components/LoginForm.test.tsx
git commit -m "feat: use PasswordInput in LoginForm"
```

---

### Task 4: Wire `PasswordInput` into `SignupForm`

**Files:**

- Modify: `src/features/auth/components/SignupForm.tsx`

- [ ] **Step 9: Add the import and replace the password field block**

Add import at the top of `SignupForm.tsx` (after the existing imports):

```tsx
import { PasswordInput } from '@/shared/components/PasswordInput';
```

Replace the entire `{/* Password */}` section (lines 100–129 in the original file):

```tsx
{
  /* Password */
}
<div className="group">
  <label
    htmlFor="password"
    className="mb-1 block text-[10px] font-medium tracking-widest text-outline-variant uppercase transition-colors duration-200 group-focus-within:text-primary"
  >
    password
  </label>
  <PasswordInput
    id="password"
    placeholder="••••••••"
    aria-describedby={errors.password ? 'password-error' : undefined}
    aria-invalid={!!errors.password}
    {...register('password')}
  />
  {errors.password && (
    <p id="password-error" role="alert" className="mt-1.5 text-xs tracking-wide text-red-400/80">
      {errors.password.message}
    </p>
  )}
</div>;
```

- [ ] **Step 10: Update `SignupForm.test.tsx` — fix ambiguous label query**

Same issue as LoginForm. Replace every `screen.getByLabelText(/password/i)` in `SignupForm.test.tsx` with `screen.getByPlaceholderText('••••••••')`.

`SignupForm.test.tsx` has 6 occurrences (lines 23, 33, 43, 54, 71, and the `toBeInTheDocument` check). Replace all six:

```tsx
// existence check (line 23)
expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();

// typing interactions (lines 33, 43, 54, 71) — each looks like:
await user.type(screen.getByPlaceholderText('••••••••'), 'Password1!');
// or:
await user.type(screen.getByPlaceholderText('••••••••'), 'Ab1!');
```

- [ ] **Step 11: Run SignupForm tests**

```bash
npx vitest run src/features/auth/components/SignupForm.test.tsx
```

Expected: all 5 tests pass.

- [ ] **Step 12: Commit**

```bash
git add src/features/auth/components/SignupForm.tsx src/features/auth/components/SignupForm.test.tsx
git commit -m "feat: use PasswordInput in SignupForm"
```

---

### Task 5: Add `PasswordField` to `SettingsForm` and wire it

**Files:**

- Modify: `src/features/profile/components/SettingsForm.tsx`

- [ ] **Step 13: Add `useState`, `PasswordField`, and icon helpers to `SettingsForm.tsx`**

The file already imports `useState` — ensure `React` is also imported (needed for `forwardRef`). Add the import at the top:

```tsx
import React, { useState } from 'react';
```

(Replace the existing `import { useState } from 'react';` line.)

Then add these helpers **before** the `export const profileNameSchema` line:

```tsx
function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 8s2.667-5 7-5 7 5 7 5-2.667 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 2l12 12" />
      <path d="M6.5 6.5a2 2 0 002.83 2.83" />
      <path d="M4 4.3A8 8 0 001 8s2.667 5 7 5c1.1 0 2.1-.25 3-.7" />
      <path d="M12 11.7A8 8 0 0015 8s-2.667-5-7-5c-1.1 0-2.1.25-3 .7" />
    </svg>
  );
}

type PasswordFieldProps = React.InputHTMLAttributes<HTMLInputElement> & { error?: string };

const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ onKeyDown, onKeyUp, onBlur, error, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    return (
      <div className="flex flex-col gap-1">
        <div className="relative">
          <Input
            ref={ref}
            type={show ? 'text' : 'password'}
            className="pr-10"
            onKeyDown={(e) => {
              setCapsLock(e.getModifierState('CapsLock'));
              onKeyDown?.(e);
            }}
            onKeyUp={(e) => {
              setCapsLock(e.getModifierState('CapsLock'));
              onKeyUp?.(e);
            }}
            onBlur={(e) => {
              setCapsLock(false);
              onBlur?.(e);
            }}
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
          <p role="status" className="text-xs text-amber-400/80">
            Caps Lock is on
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  },
);
PasswordField.displayName = 'PasswordField';
```

- [ ] **Step 14: Replace the 3 password field blocks in the form JSX**

In the `{hasPassword && (...)}` section, replace all three `<div className="flex flex-col gap-1">` blocks (each containing `<Input type="password" .../>` + error `<p>`) with `<PasswordField>`:

Replace the **currentPassword** block:

```tsx
{
  /* BEFORE */
}
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
</div>;
```

```tsx
{
  /* AFTER */
}
<PasswordField
  {...passwordForm.register('currentPassword')}
  placeholder="Current password"
  aria-label="Current password"
  error={passwordForm.formState.errors.currentPassword?.message}
/>;
```

Replace the **newPassword** block:

```tsx
{
  /* BEFORE */
}
<div className="flex flex-col gap-1">
  <Input
    {...passwordForm.register('newPassword')}
    type="password"
    placeholder="New password"
    aria-label="New password"
  />
  {passwordForm.formState.errors.newPassword && (
    <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>
  )}
</div>;
```

```tsx
{
  /* AFTER */
}
<PasswordField
  {...passwordForm.register('newPassword')}
  placeholder="New password"
  aria-label="New password"
  error={passwordForm.formState.errors.newPassword?.message}
/>;
```

Replace the **confirmPassword** block:

```tsx
{
  /* BEFORE */
}
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
</div>;
```

```tsx
{
  /* AFTER */
}
<PasswordField
  {...passwordForm.register('confirmPassword')}
  placeholder="Confirm new password"
  aria-label="Confirm new password"
  error={passwordForm.formState.errors.confirmPassword?.message}
/>;
```

- [ ] **Step 15: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass (180+ tests, 0 failures).

- [ ] **Step 16: Commit**

```bash
git add src/features/profile/components/SettingsForm.tsx
git commit -m "feat: add PasswordField to SettingsForm with eye toggle and caps lock warning"
```

---

### Task 6: e2e cases (manual verification before merge)

- [ ] **Step 17: Verify in browser**

Start dev server: `npm run dev`

Start dev server: `npm run dev`

**Login page (`/login`):**

1. Navigate to `/login`
2. Click the eye icon — password field should switch to plain text
3. Click again — back to `••••••••`
4. Eye button aria-label: inspect element, confirm "Show password" / "Hide password" toggles
5. Enable Caps Lock, click into the password field, type any key — "caps lock is on" warning appears below the field
6. Disable Caps Lock, type a key — warning disappears
7. Re-enable Caps Lock, type, then click outside the field — warning disappears

**Signup page (`/signup`):** repeat steps 1–7.

**Settings page (`/settings`):**

1. Log in and navigate to `/settings`
2. Scroll to the "Change password" section (only visible for accounts with a password, not OAuth-only)
3. Repeat the eye toggle and Caps Lock checks for all three fields (current / new / confirm)
4. Confirm that submitting with a wrong current password still shows the error message below the field
