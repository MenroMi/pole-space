# Password Input UX — Design Spec

Date: 2026-04-23

## Problem

Password fields in auth forms and settings have no visibility toggle and no feedback when Caps Lock is active. Users mistype passwords silently, leading to failed login/signup attempts.

## Scope

### In scope

- Eye toggle button (show/hide password) on all password fields
- Caps Lock warning message below the input when active while focused
- Three locations: `LoginForm`, `SignupForm`, `SettingsForm`

### Out of scope

- Password strength meter
- Confirm-password "match" indicator
- Any changes to validation logic

---

## Component Architecture

Two visual contexts exist in the codebase:

| Context                                | Style                                   | Fields       |
| -------------------------------------- | --------------------------------------- | ------------ |
| Auth forms (`LoginForm`, `SignupForm`) | Bottom-border animation, `px-0`, no box | 1 field each |
| Settings form (`SettingsForm`)         | shadcn `<Input>`, border-box, rounded   | 3 fields     |

### Component 1: `PasswordInput`

**File:** `src/shared/components/PasswordInput.tsx`

**Used by:** `LoginForm`, `SignupForm`

`React.forwardRef` component that accepts all `React.InputHTMLAttributes<HTMLInputElement>` props. RHF `{...register('password')}` spreads onto it directly — no adapter needed.

**Renders:**

```
div.relative
  ├── <input ref={ref} type={show ? 'text' : 'password'} className="...pr-8" />
  ├── div.pointer-events-none  ← bottom-border animation (identical to current)
  └── <button type="button" aria-label="Show/Hide password" aria-pressed={show}>
        inline SVG eye / eye-off icon (16×16)
[capsLock && <p role="status" className="mt-1.5 text-xs tracking-wide text-amber-400/80">
  caps lock is on
</p>]
```

The outer `div.group`, `<label>`, and RHF error `<p>` remain in the form — the component does not own them.

The eye button is absolutely positioned (`absolute right-0 top-1/2 -translate-y-1/2`) and does not push the border animation line.

**Input padding:** `pr-8` added so typed text does not overlap the eye button.

---

### Component 2: `PasswordField` (private, in `SettingsForm.tsx`)

**File:** `src/features/profile/components/SettingsForm.tsx` (local, not exported)

Wraps shadcn `<Input>` for the change-password form section. `React.forwardRef` component (needed so RHF's `register` ref reaches the inner `<input>`). Accepts `React.InputHTMLAttributes<HTMLInputElement>` + `error?: string`. Includes its own error rendering (replaces the existing `<Input> + <p>` pattern used 3×).

**Renders:**

```
div.flex.flex-col.gap-1
  ├── div.relative
  │     ├── <Input type={show ? 'text' : 'password'} className="pr-10" ref={ref} />
  │     └── eye toggle button (absolute right-2 top-1/2 -translate-y-1/2)
  [capsLock && <p role="status" className="text-xs text-amber-400/80">Caps Lock is on</p>]
  [error && <p className="text-sm text-destructive">{error}</p>]
```

---

## Caps Lock Detection

Identical logic in both components:

```ts
onKeyDown: (e) => {
  setCapsLock(e.getModifierState('CapsLock'));
  props.onKeyDown?.(e);
};
onKeyUp: (e) => {
  setCapsLock(e.getModifierState('CapsLock'));
  props.onKeyUp?.(e);
};
onBlur: (e) => {
  setCapsLock(false);
  props.onBlur?.(e);
};
```

- `onKeyDown` detects caps lock state while typing
- `onKeyUp` catches the CapsLock key toggle itself (state changes on key-up in most browsers)
- `onBlur` hides the warning when the field loses focus (user doesn't need the reminder for a field they're not typing in)
- `onFocus` intentionally NOT used — `getModifierState` on focus is unreliable across browsers; warning appears on first keystroke

---

## Eye Toggle Button

- `type="button"` — must not submit the form
- `aria-label`: `"Show password"` / `"Hide password"` (toggles with state)
- `aria-pressed`: reflects current `show` state
- Style: `absolute right-0`, `text-outline-variant`, `hover:text-on-surface`, `transition-colors`, `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`
- Icons: inline SVG, 16×16 (eye / eye-off, Heroicons-style strokes)

---

## Changes to Existing Forms

### `LoginForm`

Replace:

```tsx
<div className="relative">
  <input id="password" type="password" ... {...register('password')} />
  <div className="...animation..." />
</div>
```

With:

```tsx
<PasswordInput
  id="password"
  placeholder="••••••••"
  aria-describedby={errors.password ? 'password-error' : undefined}
  aria-invalid={!!errors.password}
  {...register('password')}
/>
```

### `SignupForm`

Same replacement as `LoginForm`.

### `SettingsForm`

Replace each `<Input type="password" ... /> + <p>error</p>` block (3×) with:

```tsx
<PasswordField
  {...passwordForm.register('currentPassword')}
  placeholder="Current password"
  aria-label="Current password"
  error={passwordForm.formState.errors.currentPassword?.message}
/>
```

---

## Files

| Action | Path                                               |
| ------ | -------------------------------------------------- |
| Create | `src/shared/components/PasswordInput.tsx`          |
| Create | `src/shared/components/PasswordInput.test.tsx`     |
| Modify | `src/features/auth/components/LoginForm.tsx`       |
| Modify | `src/features/auth/components/SignupForm.tsx`      |
| Modify | `src/features/profile/components/SettingsForm.tsx` |

---

## Tests (`PasswordInput.test.tsx`)

1. Renders `type="password"` by default
2. Eye button click → `type="text"`
3. Second eye button click → back to `type="password"`
4. Eye button has correct `aria-label` for each state
5. Caps Lock warning visible after `keydown` with `getModifierState('CapsLock') = true`
6. Caps Lock warning not visible after `keydown` with `getModifierState('CapsLock') = false`
7. Caps Lock warning hidden after `blur`
8. `props.onBlur` (from RHF register) is called on blur

No unit tests for `PasswordField` (private component) — behaviour is covered by the `PasswordInput` tests since the logic is identical.
