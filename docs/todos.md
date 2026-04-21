# Project TODOs

## Security

### ~~Auth guards in Server Actions~~ ✅ Resolved (2026-04-19)

~~**`src/features/admin/actions.ts`**~~

- ~~`createMoveAction` and `deleteMoveAction` have no role check~~
- `requireAdmin()` guard added — throws `Unauthorized` if session is null or role ≠ ADMIN; 6 unit tests

~~**`src/features/profile/actions.ts`**~~

- ~~`updateProgressAction` takes `userId` as a parameter — caller could pass any userId~~
- `userId` removed from `getUserProgressAction` and `updateProgressAction`; derived from `auth()` session via `requireAuth()` helper; 4 unit tests

## Post-Features Security Hardening

> Implement after core feature set is complete, before public launch.

### Rate limiting on auth endpoints

- No rate limiting on `/api/auth/signin` — brute force possible
- No rate limiting on signup — email bombing possible
- Fix: add Upstash Ratelimit middleware to `/api/auth/signin` and `signupAction`

### Auth edge cases

- OAuth user tries to login via credentials (no password set) — returns generic error, no helpful message
- Expired session doesn't preserve `callbackUrl` on redirect to login
- No account lockout after N failed login attempts

### Timing oracle in email verification

- `src/app/api/auth/verify/route.ts` — expired token branch does an extra DB delete before redirecting; missing token returns immediately
- An attacker can distinguish "token never existed" from "token existed but expired" by response time
- Fix: consolidate both error cases to the same response path (skip delete, redirect immediately)

### Email in verification URL

- `src/app/api/auth/verify/route.ts` passes `email` as a plain query param (`?error=expired&email=...`)
- Email appears in server logs, referrer headers, and analytics tools
- Fix: remove email from URL, prompt user to re-enter it on the expired page

### E2e / browser tests (Playwright)

- No browser-level coverage for login/signup flows
- Fix: set up Playwright, add e2e tests for: signup → verify email → login → access protected route

### ~~Proxy matcher scope (minor)~~ ✅ Resolved (2026-04-19)

- ~~`src/proxy.ts` matcher runs on every route; only `/profile` and `/admin` are actually protected~~
- ~~Fix: narrow matcher to `['/profile/:path*', '/admin/:path*']` for explicitness, or keep broad if adding more protected routes soon~~
- Narrowed to `['/profile/:path*', '/admin/:path*']`; `getProtectedRedirect` extracted for testability; 5 unit tests added

### ~~Email sender domain~~ ✅ Partially resolved (2026-04-19)

- ~~`src/features/auth/lib/email.ts` uses `onboarding@resend.dev` (Resend shared test domain)~~
- Code: `FROM` now reads from `RESEND_FROM` env var (fallback: `onboarding@resend.dev`)
- **Action required:** configure a verified sender domain in Resend dashboard, then set `RESEND_FROM=noreply@yourdomain.com` in `.env.local` and Vercel env vars

## UX / Validation

~~**`src/features/auth/components/SignupForm.tsx`**~~ ✅ Resolved (2026-04-19)

- ~~`name` field uses Zod defaults (`"String must contain at least 2 character(s)"`) — inconsistent with password field which has a custom message~~
- ~~Fix: add `.min(2, 'Name must be at least 2 characters')` and `.max(50, 'Name is too long')` to `signupSchema.name`~~
- `signupSchema.name` now uses custom messages; consistent with `password` field

~~**`src/features/auth/components/SignupForm.test.tsx`**~~ ✅ Resolved (2026-04-19)

- ~~`name` field validation is not tested (empty name, name < 2 chars)~~
- ~~Fix: add a test case for short/empty name before shipping to production~~
- 3 tests added: 2 in `validation.test.ts` (min/max message strings), 1 in `SignupForm.test.tsx` (UI render)

## Feature Gaps

**`src/features/catalog/actions.ts`**

- `getMovesAction` ignores `filters.tags` — tag-based filtering not implemented
- `MoveFilters.tags` field in `src/shared/types/index.ts` is misleadingly present
- Fix: implement tag filter OR remove the field from MoveFilters until needed

**`src/features/auth/actions.ts`**

- `signupAction` doesn't return the created user
- Fix: return `prisma.user.create(...)` result if callers need the user ID

## Architecture Notes

**`src/app/(main)/catalog/page.tsx`**

- When filling in UI, call `getMovesAction` directly in the Server Component — do NOT fetch via `/api/moves`
- Fetching your own API route from a Server Component is an RSC anti-pattern (unnecessary network hop)

**PageShell usage pattern**

- Pages that need an aside (filters, related content, etc.) wrap their content in `<PageShell aside={...}>`
- Pages without an aside render `{children}` directly — no PageShell needed
- The aside content is page-specific: e.g. CatalogFilters on /catalog, related moves on /moves/[id]
- `(main)/layout.tsx` provides only Header + Footer — PageShell lives at the page level, not the layout level

**Font utilities**

- `font-display` → Space Grotesk (headings, wordmark, move titles)
- `font-sans` → Manrope (body text, labels, form fields)
- Both defined as `@utility` in `globals.css` (Tailwind v4 does not auto-generate font utilities beyond sans/serif/mono)

## Infrastructure

~~**Neon DB not connected**~~ ✅ Resolved — DB connected, schema pushed (2026-04-19)

~~**Vitest picks up .worktrees/ test files**~~ ✅ Resolved (2026-04-20) — added `'.worktrees/**'` to `exclude` in `vitest.config.ts`

**Prettier + ESLint not configured**

- Проект без форматтера и линтера — стиль зависит от желания конкретного реализатора/ревьюера
- Fix: отдельной feature branch настроить Prettier (с Tailwind plugin для сортировки классов) + ESLint (Next.js config + typescript-eslint). Добавить npm scripts `lint`, `format`, и pre-commit hook (lint-staged + husky или simple-git-hooks)

## UX

**Catalog filters UX — требует ресёрча и возможного редизайна** (2026-04-21)

- Текущая реализация (ветка `feature/filters-accordion`): Accordion type="single" collapsible, внутри каждой категории "All levels" + 3 difficulty-кнопки. Single-select для category и difficulty. Toggle-поведение: клик по активной группе снимает category+difficulty (search сохраняется); клик по активной difficulty снимает только её.
- Сомнения пользователя: (1) accordion может быть непривычен для фильтров каталога; (2) "клик по активному = снять" — неочевидный жест, не все пользователи поймут; (3) single-select vs multi-select — не принято решение (варианты A/B/C ниже).
- Что нужно сделать перед редизайном:
  - Ресёрч UX-паттернов фильтров в каталогах (chips, sidebar checkboxes, bottom-sheet на mobile, combobox/select)
  - Определиться с single vs multi-select (см. "Multi-select filters in catalog" ниже)
  - Решить: мобильная версия vs десктоп — разные паттерны или единый
  - Возможно, создать spec через `superpowers:brainstorming` + `superpowers:writing-plans`
- Scope: отдельная feature branch после завершения Stage 2C–2E (Profile/Admin/Landing). Текущая реализация остаётся в main как baseline.

**Multi-select filters in catalog**

- Сейчас category и difficulty — single-select (one-hot). Пользователь может захотеть фильтровать несколько одновременно (например, SPIN + CLIMB, или INTERMEDIATE + ADVANCED).
- Варианты реализации:
  - **A. Checkbox-группы** — заменить buttons на checkboxes, category и difficulty становятся массивами в URL (`?category=SPIN,CLIMB&difficulty=BEGINNER,INTERMEDIATE`). Требует изменения типа `MoveFilters` и SQL-логики в `getMovesAction` (OR-условия внутри группы).
  - **B. Multi-toggle buttons** — оставить buttons, но кликая по неактивной — добавлять к выборке, по активной — убирать. Визуально активные выделены `bg-primary`. URL как в A.
  - **C. Chips (selected filters bar)** — отдельная строка под фильтрами с выбранными значениями в виде chips (`× SPIN`, `× BEGINNER`), клик по X снимает. Клик по кнопке в accordion добавляет.
- Backend: `getMovesAction` пока ожидает `category?: Category` и `difficulty?: Difficulty` — нужно менять на массивы.
- Решение отложено до ресёрча (см. выше).
