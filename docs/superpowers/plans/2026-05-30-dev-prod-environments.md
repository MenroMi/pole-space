# Dev / Prod Environments + Cloudflare Access — Implementation Runbook

> **Nature of this plan:** Almost all of the work is **infrastructure configuration in dashboards** (Neon, Vercel, Cloudflare, Google), performed by the project owner. There is exactly **one code change**, already committed. This document is therefore an **ordered runbook with per-step verification**, not a TDD task plan.

**Goal:** Run two isolated environments — public prod (`pole-space.com` / `main`) and private dev (`dev.pole-space.com` / `develop`) — with the dev site gated by Cloudflare Access (per-email), separate Neon databases, and auto-applied migrations on each deploy.

**Architecture:** One GitHub repo connected to two Vercel projects (each with its own branch, domain, env vars, and Neon DB). Migrations apply automatically in each build via the `vercel-build` script. Dev access is enforced entirely at Cloudflare's edge by an Access policy — no app code.

**Tech Stack:** Vercel (Hobby, two projects), Neon (Postgres), Cloudflare (DNS + Zero Trust Access), Prisma 7, NextAuth, next-intl. Spec: `docs/superpowers/specs/2026-05-30-dev-prod-environments-design.md`.

**Ordering matters:** Step 2 (develop branch) must precede Step 3 (dev Vercel project). Step 5 (DNS + domain) must precede Step 6 (Access). Do the steps in order.

---

### Step 0 — Code: `vercel-build` script ✅ DONE

- Committed (`9d95dbd`): `package.json` gains `"vercel-build": "prisma generate && prisma migrate deploy && next build"`. Vercel auto-detects `vercel-build` and uses it, so every deploy applies committed migrations to that project's `DATABASE_URL` before building.
- Verify: `npm pkg get scripts.vercel-build` returns the string above. (Already confirmed.)
- This is shared by both environments; no further code changes are required for this feature.

---

### Step 1 — Create the dev Neon database

- [ ] In the Neon console, create a **new database** (or new project) for dev — separate from prod.
- [ ] Copy its pooled connection string → this is the dev `DATABASE_URL`.
- **Verify:** the dev connection string is different from the prod one and is reachable (Neon shows it as active).

---

### Step 2 — Create the `develop` branch

- [ ] From `main` (at the latest commit), create and push `develop`:
  ```bash
  git checkout main && git pull
  git checkout -b develop
  git push -u origin develop
  ```
- **Verify:** `develop` appears on GitHub and matches `main`.

> Note: this feature's own work lives on `worktree-feat+dev-prod-environments`. Merge that branch into `develop` first (so the `vercel-build` script is present), then `develop` deploys carry it. The dev project will deploy whatever is on `develop`.

---

### Step 3 — Create the dev Vercel project

- [ ] In Vercel, **Add New → Project**, import the **same** GitHub repo again. Name it `pole-space-dev`.
- [ ] Settings → Git → **Production Branch = `develop`**.
- [ ] Settings → Git → **Ignored Build Step**: only build when on `develop`. Use:
  ```bash
  bash -c 'if [ "$VERCEL_GIT_COMMIT_REF" = "develop" ]; then exit 1; else exit 0; fi'
  ```
  (exit 1 = build, exit 0 = skip — so it builds only `develop`.)
- [ ] Settings → Environment Variables (Production scope of this project), per the spec matrix:
  - `DATABASE_URL` = dev Neon string (Step 1)
  - `NEXTAUTH_URL` = `https://dev.pole-space.com`
  - `NEXTAUTH_SECRET` = a fresh secret (`openssl rand -base64 32`)
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` = same as prod
  - `RESEND_*`, `CLOUDINARY_*`, `UPSTASH_*`, `NOMINATIM_USER_AGENT`, `RATELIMIT_FALLBACK_IP` = same as prod for now
- **Verify:** trigger a deploy of `develop`; the build log shows the `vercel-build` script running `prisma migrate deploy` against the dev DB and `next build` succeeding. The deployment is reachable on its `*.vercel.app` URL (Cloudflare/domain comes next).

---

### Step 4 — Pin the prod project to `main` only

- [ ] In the existing `pole-space` (prod) project → Settings → Git → Ignored Build Step so it builds only `main`:
  ```bash
  bash -c 'if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 1; else exit 0; fi'
  ```
- **Verify:** pushing `develop` does **not** trigger a prod build, and pushing `main` does not trigger a dev build.

---

### Step 5 — DNS + domain for `dev.pole-space.com`

- [ ] In the **dev** Vercel project → Settings → Domains → add `dev.pole-space.com`. Vercel shows the required DNS target (a CNAME, typically `cname.vercel-dns.com`).
- [ ] In **Cloudflare DNS** → add a `CNAME` record `dev` → the Vercel target, **Proxy status = Proxied (orange cloud)**.
- [ ] In Cloudflare **SSL/TLS** → set encryption mode to **Full (strict)** (avoids redirect loops between Cloudflare and Vercel).
- **Verify:** `https://dev.pole-space.com` loads the dev deployment (before Access is added). `dig dev.pole-space.com` resolves to Cloudflare IPs (proxied).

---

### Step 6 — Cloudflare Access (Zero Trust) policy

- [ ] Cloudflare dashboard → **Zero Trust**. If first time, complete the free Zero Trust onboarding (team name; free plan ≤ 50 users).
- [ ] **Access → Applications → Add an application → Self-hosted.**
  - Application domain: `dev.pole-space.com`.
  - Session duration: e.g. 24h–7d (tester convenience).
- [ ] Add a **policy**: Action = **Allow**; Include = **Emails** → list the tester emails (this is your "registered emails").
- [ ] Login methods: enable **One-time PIN** (email OTP) and/or **Google**.
- **Verify:**
  - From a browser, open `https://dev.pole-space.com` → Cloudflare Access login appears.
  - Enter an **allowlisted** email → receive OTP (or Google) → after verifying, the app loads.
  - Enter a **non-allowlisted** email → blocked by Cloudflare; the app is never reached.

---

### Step 7 — Google OAuth redirect URI for dev

- [ ] Google Cloud Console → the existing OAuth client → Authorized redirect URIs → add:
  ```
  https://dev.pole-space.com/api/auth/callback/google
  ```
- **Verify:** on dev (past Cloudflare Access), "Sign in with Google" completes without a `redirect_uri_mismatch` error.

---

### Step 8 — Seed the dev database (one-time)

- [ ] With the dev `DATABASE_URL` exported locally, run the seeds:
  ```bash
  DATABASE_URL='<dev-neon-url>' npx tsx prisma/seed.ts
  DATABASE_URL='<dev-neon-url>' npx tsx prisma/seed-tags.ts
  DATABASE_URL='<dev-neon-url>' SEED_USER_EMAIL='<you>' npx tsx prisma/seed-progress.ts
  DATABASE_URL='<dev-neon-url>' npx tsx prisma/seed-coach-notes.ts
  ```
  (Run only the seeds you need; `seed-progress` requires an existing user — create one via signup on dev first.)
- **Verify:** the dev catalog shows moves; tags appear in filters.

---

### Step 9 — End-to-end smoke test

- [ ] **Access gate:** non-allowlisted email blocked at Cloudflare; allowlisted email reaches the app; removing an email from the Access policy blocks that person on next visit.
- [ ] **App inside dev:** signup → email verification → login → profile all work against the **dev** DB (not prod).
- [ ] **Migrations:** the dev deploy build log shows `prisma migrate deploy` applied (and dev DB schema matches `prisma/schema.prisma`).
- [ ] **Isolation:** `pole-space.com` (prod) remains public, unaffected, and on the prod DB.
- [ ] **Promotion flow:** open a feature branch → PR into `develop` → dev redeploys → after testing, PR `develop`→`main` → prod redeploys.

---

## Done criteria

- Pushing `develop` deploys to `dev.pole-space.com` (dev Neon DB), reachable only by allowlisted emails via Cloudflare Access.
- Pushing `main` deploys to `pole-space.com` (prod Neon DB), public.
- Each deploy auto-applies committed migrations to its own DB.
- No environment-gating code lives in the repo (only the shared `vercel-build` script).
