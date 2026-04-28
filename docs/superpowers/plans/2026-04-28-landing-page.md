# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing page stub with a minimal, isolated landing page that redirects authenticated users to `/catalog` and shows unauthenticated visitors a branded single-screen landing.

**Architecture:** Server component at `src/app/page.tsx` — calls `auth()` before rendering, redirects to `/catalog` if session exists, otherwise renders the full landing page. Styles live in a co-located CSS module `src/app/landing.module.css` to handle keyframe animations and pseudo-elements that Tailwind cannot express.

**Tech Stack:** Next.js App Router (RSC), CSS Modules, next-auth (`auth()`), next/navigation (`redirect`), next/link, Vitest + RTL

---

### Task 1: CSS module

**Files:**

- Create: `src/app/landing.module.css`

- [ ] **Step 1: Create the CSS module**

Create `src/app/landing.module.css`:

```css
.page {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: 32px clamp(24px, 6vw, 64px);
  position: relative;
  overflow: hidden;
  background: #0d0e0f;
  color: #e2e2e2;
  font-family: var(--font-sans);
}

/* Soft violet spotlight — slow drift */
.page::before {
  content: '';
  position: absolute;
  top: 30%;
  left: 50%;
  width: 600px;
  height: 600px;
  transform: translate(-50%, -30%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(220, 184, 255, 0.08), transparent 70%);
  filter: blur(40px);
  pointer-events: none;
  animation: drift 18s ease-in-out infinite alternate;
}

@keyframes drift {
  from {
    transform: translate(-55%, -32%);
  }
  to {
    transform: translate(-45%, -28%);
  }
}

/* Vertical pole shaft — thematic hairline */
.page::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: linear-gradient(
    180deg,
    transparent,
    rgba(151, 142, 155, 0.18) 25%,
    rgba(151, 142, 155, 0.18) 75%,
    transparent
  );
  pointer-events: none;
  z-index: 1;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 2;
}

.brand {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #e2e2e2;
  text-transform: lowercase;
  text-decoration: none;
}

.dot {
  color: #dcb8ff;
}

.meta {
  font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #978e9b;
}

.center {
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 560px;
  position: relative;
  z-index: 2;
  padding: 80px 0;
}

.eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #dcb8ff;
  margin-bottom: 28px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.eyebrow::before {
  content: '';
  width: 24px;
  height: 1px;
  background: currentColor;
  flex-shrink: 0;
}

.h1 {
  font-family: var(--font-display);
  font-size: clamp(40px, 5.5vw, 64px);
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1.05;
  color: #e2e2e2;
  margin: 0 0 28px;
  text-wrap: balance;
  text-transform: none;
}

.h1 em {
  font-style: italic;
  font-weight: 400;
  color: inherit;
}

.lede {
  font-size: 16px;
  line-height: 1.6;
  color: #cdc3d2;
  margin: 0 0 40px;
  max-width: 460px;
  text-wrap: pretty;
}

.actions {
  display: flex;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}

.btnPrimary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: 0;
  color: #dcb8ff;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  padding: 14px 0;
  border-bottom: 1px solid #dcb8ff;
  text-decoration: none;
  cursor: pointer;
  transition: gap 180ms ease;
}

.btnPrimary:hover {
  gap: 14px;
}

.btnLink {
  font-family: var(--font-sans);
  font-size: 13px;
  color: #cdc3d2;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  padding-bottom: 2px;
  transition:
    border-color 200ms ease,
    color 200ms ease;
}

.btnLink:hover {
  border-bottom-color: #cdc3d2;
  color: #e2e2e2;
}

.formHint {
  margin-top: 18px;
  font-size: 11px;
  color: #4b4450;
  font-family: ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace;
  letter-spacing: 0.05em;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  position: relative;
  z-index: 2;
  font-size: 11px;
  color: #978e9b;
  gap: 20px;
  flex-wrap: wrap;
}

.footer a {
  color: #cdc3d2;
  text-decoration: none;
}

.footer a:hover {
  color: #dcb8ff;
}

.madeBy {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #4b4450;
}

.name {
  color: #978e9b;
}

@media (max-width: 640px) {
  .meta {
    display: none;
  }

  .footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/landing.module.css
git commit -m "style: add landing page CSS module"
```

---

### Task 2: Landing page component

**Files:**

- Modify: `src/app/page.tsx`
- Create: `src/app/page.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/app/page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HomePage from './page';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/shared/lib/auth', () => ({ auth: vi.fn() }));

import { auth } from '@/shared/lib/auth';

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /catalog when session exists', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: '1' } } as never);
    await HomePage();
    expect(redirect).toHaveBeenCalledWith('/catalog');
  });

  it('renders landing content when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    render(await HomePage());
    expect(screen.getByText(/quiet place/i)).toBeInTheDocument();
  });

  it('shows "Create an account" link pointing to /sign-up', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    render(await HomePage());
    const link = screen.getByRole('link', { name: /create an account/i });
    expect(link).toHaveAttribute('href', '/sign-up');
  });

  it('shows "Browse the catalog" link pointing to /catalog', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    render(await HomePage());
    const link = screen.getByRole('link', { name: /browse the catalog/i });
    expect(link).toHaveAttribute('href', '/catalog');
  });

  it('shows "Free. No invite needed." hint', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    render(await HomePage());
    expect(screen.getByText(/free\. no invite needed\./i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test src/app/page.test.tsx
```

Expected: FAIL — current stub renders `<h1>Pole Space</h1>`, assertions about landing content will fail.

- [ ] **Step 3: Implement the landing page**

Replace `src/app/page.tsx`:

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { auth } from '@/shared/lib/auth';

import styles from './landing.module.css';

export default async function HomePage() {
  const session = await auth();
  if (session) redirect('/catalog');

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <span className={styles.brand}>
          pole space<span className={styles.dot}>.</span>
        </span>
        <span className={styles.meta}>— catalog · 2026</span>
      </header>

      <main className={styles.center}>
        <div className={styles.eyebrow}>A small catalog</div>
        <h1 className={styles.h1}>
          A quiet place to keep the moves you&apos;re <em>working on</em>.
        </h1>
        <p className={styles.lede}>
          A small, careful catalog of pole moves — written by performers we know, photographed in
          studios we visit. No feed, no streaks. Just the moves and your notes.
        </p>
        <div className={styles.actions}>
          <Link href="/sign-up" className={styles.btnPrimary}>
            Create an account →
          </Link>
          <Link href="/catalog" className={styles.btnLink}>
            Browse the catalog
          </Link>
        </div>
        <p className={styles.formHint}>Free. No invite needed.</p>
      </main>

      <footer className={styles.footer}>
        <span>© 2026 pole space</span>
        <span className={styles.madeBy}>
          Made in Zagreb · by <span className={styles.name}>two performers</span>
        </span>
        <span>
          <a href="mailto:contact@polespace.com">contact@polespace.com</a>
        </span>
      </footer>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/app/page.test.tsx
```

Expected: 5 passing, 0 failures.

- [ ] **Step 5: Run full test suite**

```bash
npm test
```

Expected: 346 passing (341 baseline + 5 new), 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/app/page.test.tsx
git commit -m "feat: landing page — auth redirect + minimal design"
```
