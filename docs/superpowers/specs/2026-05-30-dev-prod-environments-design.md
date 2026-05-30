# Dev / Prod Environments + Dev Access Gate — Design Spec

**Date:** 2026-05-30
**Status:** Approved (pending spec review)
**Branch / worktree:** `worktree-feat+dev-prod-environments` (`.claude/worktrees/feat+dev-prod-environments`)

## Goal

Stand up two fully isolated deployment environments so changes are validated before reaching production, and lock the dev environment so only authorized people can open it.

1. **prod** — the public site (`pole-space.com`), unchanged behavior.
2. **dev** — a private staging site (`dev.pole-space.com`) where the entire app is gated: a visitor can open it only by passing a **dev access gate** that requires an allowlisted **email** AND a shared **password**.

The dev gate controls *environment access only* — it is orthogonal to the app's own NextAuth login. Passing the gate does not log you into the app; inside the gate, the app behaves exactly like prod (public catalog/landing visible, profile/admin still require normal NextAuth login).

## Locked decisions

| Topic | Decision |
|---|---|
| Topology | Dev + Prod (2 deploys) |
| Hosting | Vercel **Hobby** → **two separate Vercel projects** (Custom Environments need Pro, so unavailable) |
| Database | Separate Neon database for dev (own `DATABASE_URL`); prod DB untouched |
| Git workflow | `develop` → dev, `main` → prod. feature → PR into `develop` → test on dev → PR `develop`→`main` → prod |
| Dev domain | `dev.pole-space.com` (Cloudflare DNS → Vercel dev project) |
| Dev access | Whole dev site private behind a gate: **allowlisted email + one shared password** |
| Gate cookie | Signed JWT (`jose`, HS256 = HMAC) `{ email, exp }`, verified in middleware |
| Allowlist storage | Env var `DEV_ALLOWED_EMAILS` (comma-separated) |
| Migrations | Auto: `prisma migrate deploy` in each project's build, against that env's DB |
| Env flag | `APP_ENV` (`production` / `development`) — source of truth for "is this dev?" (because `NODE_ENV` is always `production` on Vercel) |

## Architecture

### Two Vercel projects (one GitHub repo, connected twice)

| | **prod** | **dev** |
|---|---|---|
| Vercel project | `pole-space` | `pole-space-dev` |
| Production Branch | `main` | `develop` |
| Domain | `pole-space.com` | `dev.pole-space.com` |
| Neon DB | prod database | dev database |
| `APP_ENV` | `production` | `development` |
| Access | public | private (gate) |

Each project owns its own env vars (all in that project's Production scope). Each project's build runs `prisma migrate deploy` against its own `DATABASE_URL`. Cross-builds are disabled so each project only builds its own branch (Vercel "Ignored Build Step").

Cookies are host-scoped, so `dev.pole-space.com` and `pole-space.com` sessions never collide.

### Dev access gate (two orthogonal layers on dev)

**Layer 1 — environment gate (new, dev-only):** a minimal custom page `/dev-gate` (root route, outside `[locale]`, no i18n) with two fields: **email + password**.

- Server action `verifyDevAccess(email, password)`:
  - Pass iff `isEmailAllowed(email)` **AND** `password === DEV_GATE_PASSWORD` (constant-time compare).
  - On pass → set cookie `dev_access` = signed JWT `{ email, exp }` (signed with `DEV_GATE_SECRET` via `jose`, HS256), `httpOnly` + `secure` + `sameSite=lax`, ~30-day expiry → redirect into the app.
  - On fail → render an error ("до свидания") on the same page; no cookie set. (Generic error — do not reveal which of email/password was wrong.)
- Middleware (`proxy.ts`), only when `isDevEnv()`:
  - Verify the `dev_access` cookie: signature valid + not expired + `isEmailAllowed(token.email)` still true.
  - Invalid/missing → redirect to `/dev-gate` (everything else is locked).
  - `/dev-gate` and its server-action POST are always reachable without the cookie.
  - On prod (`APP_ENV=production`) the gate branch is skipped entirely; `/dev-gate` returns 404 on prod.

Why the JWT signature is required (not just an email cookie): with a password in the mix, the cookie must be **unforgeable proof of passing email+password**. An unsigned `dev_access=<email>` cookie could be hand-set by someone who knows an allowlisted email but not the password, bypassing the password. The signature (secret server-side only) makes the gate the only way to mint a valid cookie.

Why middleware also re-checks `isEmailAllowed`: gives **instant revocation** — removing an email from `DEV_ALLOWED_EMAILS` invalidates that person's cookie immediately, without waiting for `exp`.

**Layer 2 — app auth (NextAuth), unchanged:** inside the gate, the app is identical to prod. Public pages visible to anyone past the gate; profile/admin require normal NextAuth login. No changes to `authorize` / `signIn` / `signupAction`.

Three dev states:
1. No valid `dev_access` cookie → only `/dev-gate` reachable.
2. Valid cookie, not app-logged-in → public pages (catalog/landing), like an anonymous prod visitor.
3. Valid cookie + app login → full access (profile, etc.).

## Code changes

All gate logic is env-conditional; on prod nothing changes.

- **`src/shared/lib/env.ts`** (new): `isDevEnv()` → `process.env.APP_ENV !== 'production'`.
- **`src/shared/lib/dev-gate.ts`** (new): `isEmailAllowed(email)` (reads `DEV_ALLOWED_EMAILS`, lowercase/trim; empty list on dev → deny all); `signDevAccess(email)` / `verifyDevAccessCookie(token)` using `jose` (HS256) + `DEV_GATE_SECRET`; constant-time password compare helper. (`jose` is already pulled in transitively by NextAuth; add it as a direct dependency if it isn't importable directly.)
- **`src/app/dev-gate/page.tsx`** (new): minimal email+password form (client) + the `verifyDevAccess` server action. The action is **rate-limited by IP** via the existing Upstash `ratelimit` helper (`src/shared/lib/ratelimit.ts`) to slow brute-force against the shared password (the form is publicly reachable). Inert/404 on prod.
- **`src/proxy.ts`** (modify): when `isDevEnv()`, gate all routes except `/dev-gate` (and matcher-excluded `api`/`_next`/dotted/`.well-known`); verify cookie; redirect to `/dev-gate` otherwise. Prod path unchanged.
- **`package.json`** (modify): build command / `vercel-build` → `prisma generate && prisma migrate deploy && next build`.
- **`.env.example`** (modify): add `APP_ENV`, `DEV_ALLOWED_EMAILS`, `DEV_GATE_PASSWORD`, `DEV_GATE_SECRET`.
- **Tests:** `isEmailAllowed` (prod=true; dev allow/deny/empty/case/whitespace); sign/verify cookie (valid, tampered, expired, wrong secret); `verifyDevAccess` (email+password matrix); middleware gate in `proxy.test.ts` (dev: no/invalid cookie → redirect to `/dev-gate`; valid → pass; `/dev-gate` reachable; prod: gate skipped).

## Migrations / seed / deploy flow

- **Migrations:** auto via `prisma migrate deploy` in each project's build → applies committed migrations to that env's DB. New migrations are authored locally (`prisma migrate dev`), committed, and flow `develop`→`main`, so prod only ever receives migrations already exercised on dev.
- **Seed (dev):** one-time, manual, not in build: `DATABASE_URL=<dev> npx tsx prisma/seed.ts` (+ `seed-tags`, `seed-progress`, `seed-coach-notes` as needed).
- **Promotion:** `feature → PR develop → merge → auto-deploy dev → test behind gate → PR develop→main → merge → auto-deploy prod`.

## Full env var matrix

| Variable | prod (`pole-space`) | dev (`pole-space-dev`) |
|---|---|---|
| `APP_ENV` | `production` | `development` |
| `DATABASE_URL` | prod Neon | dev Neon |
| `NEXTAUTH_URL` | `https://pole-space.com` | `https://dev.pole-space.com` |
| `NEXTAUTH_SECRET` | own | own |
| `DEV_ALLOWED_EMAILS` | — | `a@x.com,b@y.com` |
| `DEV_GATE_PASSWORD` | — | shared passphrase |
| `DEV_GATE_SECRET` | — | random secret (cookie signing) |
| `GOOGLE_CLIENT_ID/SECRET` | same client | same client + dev redirect URI |
| `RESEND_*`, `CLOUDINARY_*`, `UPSTASH_*` | prod | share with prod initially (split later if needed) |

## Manual runbook (owner, dashboards — not codeable)

1. **Neon:** create dev database → copy `DATABASE_URL`.
2. **Git:** create `develop` from `main`, push.
3. **Vercel:** new project `pole-space-dev` from the same repo → Production Branch = `develop`; set build command `prisma generate && prisma migrate deploy && next build` (both projects); set Ignored Build Step so each builds only its branch; populate env vars per matrix in each project.
4. **Cloudflare DNS:** add `dev.pole-space.com` pointing to the Vercel dev project.
5. **Google OAuth:** add redirect URI `https://dev.pole-space.com/api/auth/callback/google` to the existing client.
6. **Seed dev DB** (one-time, per above).
7. **Resend/Cloudinary/Upstash:** share with prod at first.

## Testing

- **Unit:** as listed under Code changes.
- **Manual e2e:** open `dev.pole-space.com` with no cookie → only `/dev-gate`; non-allowlisted email or wrong password → rejected (generic error); allowlisted email + correct password → access; confirm prod (`pole-space.com`) stays public and unaffected; remove an email from `DEV_ALLOWED_EMAILS` → that cookie stops working on next request.

## Out of scope

- Per-email passwords / individual gate accounts (shared password by decision).
- Edge-level protection (Vercel password / IP allowlist).
- Separate Resend/Cloudinary/Upstash for dev (deferred).
- A third (staging) environment.
- Encrypting the gate cookie (signed only; email is not confidential).

## Division of labor

- **Code (me):** `env.ts`, `dev-gate.ts`, `/dev-gate` page + action, `proxy.ts` gate, build script, `.env.example`, all tests.
- **Dashboards/DNS (owner):** Neon dev DB, second Vercel project + env vars + ignored build step, Cloudflare DNS, Google OAuth redirect URI, dev seed.
