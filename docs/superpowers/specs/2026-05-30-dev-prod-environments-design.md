# Dev / Prod Environments + Dev Access (Cloudflare Access) — Design Spec

**Date:** 2026-05-30
**Status:** Approved (pending spec review)
**Branch / worktree:** `worktree-feat+dev-prod-environments` (`.claude/worktrees/feat+dev-prod-environments`)

## Goal

Stand up two fully isolated deployment environments so changes are validated before reaching production, and lock the dev environment so only people whose email is registered can open it.

1. **prod** — the public site (`pole-space.com`), unchanged behavior.
2. **dev** — a private staging site (`dev.pole-space.com`), gated by **Cloudflare Access (Zero Trust)**: only allowlisted emails can reach it, verified by email one-time PIN (or Google login). The gate lives entirely in Cloudflare's edge — **no application code**.

The Cloudflare gate controls *environment access only*. It is orthogonal to the app's own NextAuth login: once Cloudflare lets you reach `dev.pole-space.com`, the app behaves exactly like prod (public catalog/landing visible; profile/admin still require normal NextAuth login).

## Why Cloudflare Access (vs a custom in-app gate)

A custom gate (email allowlist + shared password + signed cookie + middleware) was considered and rejected: it relies on a shared password (no per-person accountability, leaks badly), is custom auth code we must maintain and test, and is weaker. Cloudflare Access gives real per-email identity with verification, audit logs, instant revocation, edge enforcement, **zero app code**, and is **free for up to 50 users**. The DNS is already on Cloudflare, so it's a natural fit.

## Locked decisions

| Topic | Decision |
|---|---|
| Topology | Dev + Prod (2 deploys) |
| Hosting | Vercel **Hobby** → **two separate Vercel projects** (Custom Environments need Pro) |
| Database | Separate Neon database for dev (own `DATABASE_URL`); prod DB untouched |
| Git workflow | `develop` → dev, `main` → prod. feature → PR into `develop` → test on dev → PR `develop`→`main` → prod |
| Dev domain | `dev.pole-space.com`, **proxied through Cloudflare** (orange-cloud) so Access can enforce |
| Dev access | **Cloudflare Access (Zero Trust)** — per-email allowlist, email OTP / Google identity |
| Migrations | Auto: `prisma migrate deploy` in each project's build, against that env's DB |
| App code changes | Essentially none — only a `vercel-build` script for auto-migration (shared by both envs) |

## Architecture

### Two Vercel projects (one GitHub repo, connected twice)

| | **prod** | **dev** |
|---|---|---|
| Vercel project | `pole-space` | `pole-space-dev` |
| Production Branch | `main` | `develop` |
| Domain | `pole-space.com` | `dev.pole-space.com` (Cloudflare-proxied) |
| Neon DB | prod database | dev database |
| Access control | public | Cloudflare Access (per-email) |

Each project owns its own env vars (its Production scope). Each project's build runs `prisma migrate deploy` against its own `DATABASE_URL`. Cross-builds are disabled so each project only builds its own branch (Vercel "Ignored Build Step").

### Dev access via Cloudflare Access

`dev.pole-space.com` is proxied through Cloudflare. A Cloudflare **Access Application** (self-hosted, hostname `dev.pole-space.com`) sits in front of the Vercel origin with a **policy: Allow → emails in {list}**. Identity method: **One-time PIN** (email OTP) and/or Google. Flow:

1. Visitor hits `dev.pole-space.com` → Cloudflare intercepts → shows Access login.
2. Enters email → if in the allow policy → gets an OTP / Google prompt → verified → Cloudflare issues an Access session cookie → request is proxied to Vercel.
3. Non-allowlisted email → blocked at Cloudflare, never reaches Vercel.

Adding/removing testers = editing the Access policy email list (instant, no deploy). Audit logs in the Zero Trust dashboard. The app behind it is unchanged; once past Access, the user can still register/log in normally as an app user to test those flows.

## App code changes

Only one repo change — and it is **not dev-specific** (both envs use it):

- **`package.json`** (modify): add a `vercel-build` script: `prisma generate && prisma migrate deploy && next build`. Vercel auto-detects `vercel-build` and uses it for the build, so each env applies committed migrations to its own DB on deploy.

No gate page, no middleware change, no new env flag, no allowlist code. `src/proxy.ts` and auth are untouched.

## Migrations / seed / deploy flow

- **Migrations:** auto via `prisma migrate deploy` in the `vercel-build` script → applies committed migrations to that env's DB. New migrations are authored locally (`prisma migrate dev`), committed, and flow `develop`→`main`, so prod only ever receives migrations already exercised on dev.
- **Seed (dev):** one-time, manual, not in build: `DATABASE_URL=<dev> npx tsx prisma/seed.ts` (+ `seed-tags`, `seed-progress`, `seed-coach-notes` as needed).
- **Promotion:** `feature → PR develop → merge → auto-deploy dev → test behind Cloudflare Access → PR develop→main → merge → auto-deploy prod`.

## Env var matrix (per Vercel project)

| Variable | prod (`pole-space`) | dev (`pole-space-dev`) |
|---|---|---|
| `DATABASE_URL` | prod Neon | dev Neon |
| `NEXTAUTH_URL` | `https://pole-space.com` | `https://dev.pole-space.com` |
| `NEXTAUTH_SECRET` | own | own |
| `GOOGLE_CLIENT_ID/SECRET` | same client | same client + dev redirect URI |
| `RESEND_*`, `CLOUDINARY_*`, `UPSTASH_*` | prod | share with prod initially (split later if needed) |

No `DEV_*` gate variables and no `APP_ENV` — access control is entirely in Cloudflare; the app needs no env flag.

## Manual runbook (owner, dashboards — not codeable)

1. **Neon:** create dev database → copy `DATABASE_URL`.
2. **Git:** create `develop` from `main`, push.
3. **Vercel (dev project):** new project `pole-space-dev` from the same repo → Production Branch = `develop`; set Ignored Build Step so it builds only `develop`; populate env vars per matrix.
4. **Vercel (both projects):** ensure the `vercel-build` script is picked up (it ships in `package.json`); set the prod project's Ignored Build Step to build only `main`.
5. **Cloudflare DNS:** add `dev.pole-space.com` as a **proxied** (orange-cloud) record pointing at the Vercel dev deployment; in the dev Vercel project add `dev.pole-space.com` as a domain. Set Cloudflare SSL/TLS mode to **Full (strict)** to avoid redirect loops with Vercel.
6. **Cloudflare Zero Trust → Access:** create a self-hosted Access Application for `dev.pole-space.com`; add a policy **Allow** with the tester emails; enable **One-time PIN** (and/or Google) login method.
7. **Google OAuth:** add redirect URI `https://dev.pole-space.com/api/auth/callback/google` to the existing client.
8. **Seed dev DB** (one-time, per above).
9. **Resend/Cloudinary/Upstash:** share with prod at first.

## Testing

- **Unit:** none required (no new app logic; the only code change is the build script).
- **Verification of build script:** a successful dev deploy whose build log shows `prisma migrate deploy` applying migrations to the dev DB.
- **Manual e2e (Cloudflare Access):** hit `dev.pole-space.com` with a non-allowlisted email → blocked by Cloudflare (never reaches the app); with an allowlisted email → OTP/Google → reach the app; remove an email from the Access policy → that person is blocked on next visit; confirm `pole-space.com` stays public and unaffected.

## Out of scope

- Custom in-app gate (rejected in favor of Cloudflare Access).
- Separate Resend/Cloudinary/Upstash for dev (deferred).
- A third (staging) environment.
- Verifying the Cloudflare Access JWT (`Cf-Access-Jwt-Assertion`) inside the app — unnecessary; Access already blocks unauthorized traffic at the edge.

## Division of labor

- **Code (me):** the `vercel-build` script in `package.json` (+ confirm `prisma generate`/build behavior). That's the whole code footprint.
- **Dashboards/DNS (owner):** Neon dev DB, second Vercel project + env vars + ignored build step, Cloudflare DNS (proxied dev subdomain) + SSL Full (strict), Cloudflare Zero Trust Access application + email policy, Google OAuth redirect URI, dev seed.
