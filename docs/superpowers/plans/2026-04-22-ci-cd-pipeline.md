# CI/CD Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub Actions CI pipeline (quality + build + security checks), CodeQL static analysis, and Dependabot dependency updates to gate merges to `main`.

**Architecture:** Three YAML files in `.github/` — `workflows/ci.yml` (3 parallel jobs), `workflows/codeql.yml` (informational), `dependabot.yml` (weekly updates). No application code changes. Dummy env vars for `next build`; Vitest already mocks Prisma so no test DB needed.

**Tech Stack:** GitHub Actions, `actions/checkout@v4`, `actions/setup-node@v4`, `github/codeql-action@v3`, npm audit, Dependabot.

---

## File Map

| File                           | Status | Purpose                                   |
| ------------------------------ | ------ | ----------------------------------------- |
| `.github/workflows/ci.yml`     | Create | 3 parallel jobs: quality, build, security |
| `.github/workflows/codeql.yml` | Create | CodeQL static analysis, weekly + PR/push  |
| `.github/dependabot.yml`       | Create | Weekly npm + github-actions updates       |

---

### Task 1: Create `ci.yml` — quality, build, security jobs

**Files:**

- Create: `.github/workflows/ci.yml`

> Note: There are no unit tests for GitHub Actions YAML. Verification is done in Task 4 by running the exact commands locally.

- [ ] **Step 1: Create the `.github/workflows/` directory structure**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    name: Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
        env:
          HUSKY: '0'
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:run

  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
        env:
          HUSKY: '0'
      - run: npm run build
        env:
          DATABASE_URL: postgresql://x:x@localhost/x
          NEXTAUTH_SECRET: ci-secret-placeholder
          NEXTAUTH_URL: http://localhost:3000
          GOOGLE_CLIENT_ID: placeholder
          GOOGLE_CLIENT_SECRET: placeholder
          FACEBOOK_CLIENT_ID: placeholder
          FACEBOOK_CLIENT_SECRET: placeholder
          RESEND_API_KEY: placeholder
          CLOUDINARY_CLOUD_NAME: placeholder
          CLOUDINARY_API_KEY: placeholder
          CLOUDINARY_API_SECRET: placeholder

  security:
    name: Security
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
        env:
          HUSKY: '0'
      - run: npm audit --audit-level=high
```

- [ ] **Step 3: Validate YAML syntax**

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/ci.yml','utf8'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add CI workflow with quality, build, and security jobs"
```

---

### Task 2: Create `codeql.yml` — static code analysis

**Files:**

- Create: `.github/workflows/codeql.yml`

- [ ] **Step 1: Create `.github/workflows/codeql.yml`**

```yaml
name: CodeQL

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * 0'

concurrency:
  group: codeql-${{ github.ref }}
  cancel-in-progress: true

permissions:
  security-events: write
  actions: read
  contents: read

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
        with:
          category: /language:javascript-typescript
```

- [ ] **Step 2: Validate YAML syntax**

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/codeql.yml','utf8'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/codeql.yml
git commit -m "ci: add CodeQL static analysis workflow"
```

---

### Task 3: Create `dependabot.yml` — automated dependency updates

**Files:**

- Create: `.github/dependabot.yml`

- [ ] **Step 1: Create `.github/dependabot.yml`**

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

- [ ] **Step 2: Validate YAML syntax**

```bash
node -e "require('js-yaml').load(require('fs').readFileSync('.github/dependabot.yml','utf8'))" && echo "YAML valid"
```

Expected: `YAML valid`

- [ ] **Step 3: Commit**

```bash
git add .github/dependabot.yml
git commit -m "ci: add Dependabot configuration for npm and github-actions"
```

---

### Task 4: Local dry-run — verify all CI commands pass

> Run every command the CI jobs will run. This catches failures before pushing to GitHub.

**Files:** none (verification only)

- [ ] **Step 1: Run `quality` job commands**

```bash
npm run lint && npm run typecheck && npm run test:run
```

Expected:

- `lint` — exit 0, no errors
- `typecheck` — exit 0, no TypeScript errors
- `test:run` — all tests pass (125 passing)

If any command fails, fix the issue before continuing.

- [ ] **Step 2: Run `build` job command with dummy env vars**

```bash
DATABASE_URL=postgresql://x:x@localhost/x \
NEXTAUTH_SECRET=ci-secret-placeholder \
NEXTAUTH_URL=http://localhost:3000 \
GOOGLE_CLIENT_ID=placeholder \
GOOGLE_CLIENT_SECRET=placeholder \
FACEBOOK_CLIENT_ID=placeholder \
FACEBOOK_CLIENT_SECRET=placeholder \
RESEND_API_KEY=placeholder \
CLOUDINARY_CLOUD_NAME=placeholder \
CLOUDINARY_API_KEY=placeholder \
CLOUDINARY_API_SECRET=placeholder \
npm run build
```

Expected: Build completes successfully. No connection to a real database is made — Next.js App Router uses dynamic rendering and Prisma is only called at request time, not at build time.

If the build fails with a database connection error, check that all env vars are set correctly in the command above.

- [ ] **Step 3: Run `security` job command**

```bash
npm audit --audit-level=high
```

Expected: exit 0 (no high or critical vulnerabilities). Current baseline has 3 moderate vulnerabilities in `@prisma/dev` (dev-only, transitive) — these are below the threshold and will not cause a failure.

If new high/critical vulnerabilities appear, run `npm audit` without flags to read the full report and fix before continuing.

- [ ] **Step 4: Commit verification results note and finalize**

All commands pass. No additional commit needed — this task is verification only.

```bash
git log --oneline -5
```

Expected output (3 commits from Tasks 1–3 on top of the spec commit):

```
<sha> ci: add Dependabot configuration for npm and github-actions
<sha> ci: add CodeQL static analysis workflow
<sha> ci: add CI workflow with quality, build, and security jobs
<sha> docs(specs): add CI/CD pipeline design spec
```

---

## After merging to `main`

These steps are manual and done in GitHub — not part of the implementation tasks above.

**Enable branch protection on `main`:**

1. Go to repository **Settings → Branches → Add branch protection rule**
2. Branch name pattern: `main`
3. Enable: **Require status checks to pass before merging**
4. Search and add required checks: `Quality`, `Build`, `Security`
5. Enable: **Require branches to be up to date before merging**
6. Save

**Verify Dependabot is active:**
Go to repository **Insights → Dependency graph → Dependabot** — should show npm and github-actions ecosystems.

**Verify CodeQL is active:**
Go to repository **Security → Code scanning** — after first push/PR, results should appear here.
