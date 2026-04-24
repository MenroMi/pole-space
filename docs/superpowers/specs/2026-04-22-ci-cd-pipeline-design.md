# CI/CD Pipeline — Design Spec

**Date:** 2026-04-22
**Scope:** GitHub Actions CI pipeline with security scanning and Dependabot configuration.

---

## Goal

Run automated quality, build, and security checks on every PR and every push to `main`, acting as a gate before Vercel deployment. Vercel handles deployment itself via Git integration.

---

## Architecture

Three files added to `.github/`:

```
.github/
  workflows/
    ci.yml       — quality + build + security (gate for merge)
    codeql.yml   — static code analysis (informational)
  dependabot.yml — automated dependency update PRs
```

No changes to application code. No test database in CI — all checks use dummy environment variables or mock the database (Vitest already mocks Prisma).

---

## `ci.yml`

### Triggers

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
```

### Concurrency

Cancel in-progress runs when a new commit is pushed to the same branch:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

### Shared setup (each job)

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: npm
- run: npm ci
  env:
    HUSKY: '0'
```

`HUSKY: '0'` prevents Husky from running in CI (no git hooks needed). `cache: npm` caches `~/.npm` keyed on `package-lock.json` — eliminates redundant downloads across the three parallel jobs.

### Jobs (run in parallel)

#### `quality`

Steps:

1. Shared setup
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test:run`

Fails the job on any lint error, TypeScript error, or test failure.

#### `build`

Steps:

1. Shared setup
2. `npm run build`

Runs with dummy environment variables (Next.js App Router uses dynamic rendering — no DB connection at build time):

| Variable                 | Value                          |
| ------------------------ | ------------------------------ |
| `DATABASE_URL`           | `postgresql://x:x@localhost/x` |
| `NEXTAUTH_SECRET`        | `ci-secret-placeholder`        |
| `NEXTAUTH_URL`           | `http://localhost:3000`        |
| `GOOGLE_CLIENT_ID`       | `placeholder`                  |
| `GOOGLE_CLIENT_SECRET`   | `placeholder`                  |
| `FACEBOOK_CLIENT_ID`     | `placeholder`                  |
| `FACEBOOK_CLIENT_SECRET` | `placeholder`                  |
| `RESEND_API_KEY`         | `placeholder`                  |
| `CLOUDINARY_CLOUD_NAME`  | `placeholder`                  |
| `CLOUDINARY_API_KEY`     | `placeholder`                  |
| `CLOUDINARY_API_SECRET`  | `placeholder`                  |

#### `security`

Steps:

1. Shared setup
2. `npm audit --audit-level=high`

Fails only on `high` or `critical` severity vulnerabilities. `moderate` and below are informational. Current audit baseline: 3 moderate vulnerabilities in `@prisma/dev` (dev-only, transitive) — these will not trigger a failure.

---

## `codeql.yml`

### Triggers

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * 0' # every Sunday at 02:00 UTC
```

### Permissions

```yaml
permissions:
  security-events: write
  actions: read
  contents: read
```

### Concurrency

```yaml
concurrency:
  group: codeql-${{ github.ref }}
  cancel-in-progress: true
```

### Steps

```
actions/checkout@v4
github/codeql-action/init@v3       (languages: [javascript-typescript])
github/codeql-action/autobuild@v3
github/codeql-action/analyze@v3
```

Results appear in **GitHub Security → Code scanning alerts**. CodeQL is not added to branch protection required checks — it is informational only and may take 5–10 minutes.

---

## `dependabot.yml`

Both ecosystems update weekly on Monday:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
      day: monday
```

Dependabot sends security alerts and creates PRs immediately when a critical CVE is published, regardless of the weekly schedule. The schedule only governs routine version bumps.

Each Dependabot PR triggers `ci.yml` automatically.

---

## Branch Protection (manual setup in GitHub)

After workflows are merged to `main`, configure in **Settings → Branches → Add rule → `main`**:

- ✅ Require status checks to pass before merging
  - Required checks: `quality`, `build`, `security`
- ✅ Require branches to be up to date before merging

CodeQL is **not** added to required checks.

---

## Out of Scope

- Deployment steps in GitHub Actions (Vercel Git integration handles deployment)
- E2E tests in CI (tracked in `docs/todos.md`)
- Test database in CI (Vitest mocks Prisma; no real DB needed)
- Slack/email notifications on failure
- Wiz infrastructure scanning (not applicable to code-level CI)
