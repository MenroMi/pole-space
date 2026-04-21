# Prettier + ESLint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install and configure Prettier, ESLint, Husky, and lint-staged so that every `git commit` auto-formats staged files and blocks on lint errors.

**Architecture:** Flat-config ESLint 9 (`eslint.config.mjs`) using `eslint-config-next/core-web-vitals` + TypeScript rules + import/unused-imports plugins + `eslint-config-prettier` (last, disables stylistic conflicts). Prettier with `prettier-plugin-tailwindcss` for class sorting. Husky runs `lint-staged` on pre-commit. Legacy code onboarded in three split commits (prettier baseline → auto-fix lint → manual errors) with `.git-blame-ignore-revs` masking the formatting commit from `git blame`.

**Tech Stack:** ESLint 9 (flat config), eslint-config-next, eslint-plugin-import, eslint-plugin-unused-imports, eslint-config-prettier, Prettier 3, prettier-plugin-tailwindcss, Husky 9, lint-staged 15.

---

## File Map

| Action | Path                     | Purpose                                                  |
| ------ | ------------------------ | -------------------------------------------------------- |
| Create | `eslint.config.mjs`      | ESLint flat config                                       |
| Create | `.prettierrc.json`       | Prettier options                                         |
| Create | `.prettierignore`        | Prettier ignore list                                     |
| Create | `.git-blame-ignore-revs` | Mask prettier-baseline commit in git blame               |
| Create | `.husky/pre-commit`      | Runs lint-staged on commit                               |
| Modify | `package.json`           | devDeps, scripts, lint-staged config                     |
| Modify | `src/**`                 | All TS/TSX files — prettier formatting + eslint auto-fix |
| Modify | `docs/todos.md`          | Mark tech debt resolved                                  |

---

## Task 1: Create worktree

**Files:**

- Creates: `.worktrees/lint-format/`

- [ ] **Step 1: Create worktree from main**

Run from the repo root (`/Users/c.szczesny/PROGRAMMING_LEARN/pole-dance-catalog`):

```bash
git worktree add .worktrees/lint-format -b feature/lint-format
```

Expected output:

```
Preparing worktree (new branch 'feature/lint-format')
HEAD is now at <sha> ...
```

- [ ] **Step 2: Verify worktree**

```bash
git worktree list
```

Expected: three rows — main repo, `.worktrees/filters-accordion`, `.worktrees/lint-format`.

All remaining tasks run from inside `.worktrees/lint-format/`.

---

## Task 2: Install packages

**Files:**

- Modify: `package.json` (devDependencies block)

All packages use `--save-exact`. Install in one command to resolve peer deps together.

- [ ] **Step 1: Install all dev dependencies**

```bash
npm install --save-dev --save-exact \
  eslint \
  eslint-config-next \
  eslint-config-prettier \
  eslint-plugin-import \
  eslint-plugin-unused-imports \
  prettier \
  prettier-plugin-tailwindcss \
  husky \
  lint-staged
```

Expected: `package-lock.json` updated, no peer-dep errors. If there is a peer-dep warning about ESLint version, it is safe to ignore as long as ESLint 9 is installed.

- [ ] **Step 2: Verify all packages are present**

```bash
npm ls eslint eslint-config-next prettier husky lint-staged --depth=0
```

Expected: all five packages listed with exact versions (no `(deduped)` warning is fine).

---

## Task 3: Create `eslint.config.mjs`

**Files:**

- Create: `eslint.config.mjs`

- [ ] **Step 1: Create the file**

```js
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import importPlugin from 'eslint-plugin-import'
import unusedImports from 'eslint-plugin-unused-imports'
import prettier from 'eslint-config-prettier/flat'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      import: importPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludeImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  prettier,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    '.worktrees/**',
    'node_modules/**',
  ]),
])
```

Notes:

- `import/no-unresolved: 'off'` — TypeScript handles resolution; without the `eslint-import-resolver-typescript` resolver the plugin cannot follow `@/` aliases and would produce false positives.
- `pathGroups` makes the plugin classify `@/` imports as "internal" (not external) for ordering purposes.
- `'@typescript-eslint/no-unused-vars': 'off'` — disabled in favour of `unused-imports/no-unused-vars` which also handles import statements.
- `prettier` MUST be the last config entry — it disables all formatting-related ESLint rules so they don't conflict with Prettier output.

- [ ] **Step 2: Smoke-test the config loads**

```bash
npx eslint --print-config src/app/layout.tsx | head -5
```

Expected: JSON output starting with `{`. If you see `Error: Could not find config file`, the file is in the wrong directory.

---

## Task 4: Create `.prettierrc.json` and `.prettierignore`

**Files:**

- Create: `.prettierrc.json`
- Create: `.prettierignore`

- [ ] **Step 1: Create `.prettierrc.json`**

```json
{
  "singleQuote": true,
  "semi": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindStylesheet": "./src/app/globals.css"
}
```

`tailwindStylesheet` tells the plugin where the Tailwind v4 CSS-first config lives (Tailwind v4 has no `tailwind.config.ts`).

- [ ] **Step 2: Create `.prettierignore`**

```
.next/
out/
build/
coverage/
.worktrees/
node_modules/
public/
*.lock
```

- [ ] **Step 3: Smoke-test Prettier can parse a file**

```bash
npx prettier --check src/app/layout.tsx
```

Expected: either `src/app/layout.tsx` (file needs formatting) or ✓ (already formatted). An error like `No parser could be inferred` means a misconfiguration — double-check `.prettierrc.json` exists and is valid JSON.

---

## Task 5: Update `package.json` — scripts and lint-staged

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add scripts**

Open `package.json`. The current `scripts` block is:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest",
  "test:run": "vitest run"
},
```

Replace it with:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "test": "vitest",
  "test:run": "vitest run",
  "lint": "eslint .",
  "lint:fix": "eslint . --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc --noEmit",
  "prepare": "husky"
},
```

- [ ] **Step 2: Add lint-staged config**

After the closing `}` of `devDependencies`, add a top-level `lint-staged` key:

```json
"lint-staged": {
  "*.{ts,tsx,js,jsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css,yml,yaml}": ["prettier --write"]
}
```

The final `package.json` structure (condensed) should look like:

```json
{
  "name": "pole-dance-catalog",
  "scripts": { ... },
  "dependencies": { ... },
  "devDependencies": { ... },
  "lint-staged": { ... }
}
```

- [ ] **Step 3: Verify JSON is valid**

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('valid')"
```

Expected: `valid`. A syntax error means a missing comma or bracket in the JSON you edited.

---

## Task 6: Initialize Husky and create pre-commit hook

**Files:**

- Create: `.husky/pre-commit`

- [ ] **Step 1: Run husky init**

```bash
npx husky init
```

Expected: creates `.husky/pre-commit` with default content (`npm test`). Also adds `"prepare": "husky"` to scripts — but you already added it in Task 5, so this is a no-op.

- [ ] **Step 2: Replace default hook content**

Open `.husky/pre-commit`. Replace its entire content with:

```
npx lint-staged
```

Save. The file should contain exactly one line.

- [ ] **Step 3: Verify hook is executable**

```bash
ls -la .husky/pre-commit
```

Expected: the file has `-rwxr-xr-x` permissions (husky init sets this). If it isn't executable, run `chmod +x .husky/pre-commit`.

---

## Task 7: Verify tooling runs without crashing — Commit #1

This task confirms config files load successfully before committing. Violations are expected — what must NOT happen is a crash.

- [ ] **Step 1: Verify ESLint loads**

```bash
npm run lint 2>&1 | head -20
```

Expected: either lint warnings/errors (fine), or `0 errors, 0 warnings` (also fine). A crash looks like `Error [ERR_MODULE_NOT_FOUND]` or `Error: Cannot find module` — if that happens, check that all packages are installed and that `eslint.config.mjs` imports match their installed package names.

- [ ] **Step 2: Verify Prettier loads**

```bash
npm run format:check 2>&1 | head -20
```

Expected: a list of files that need formatting, or `All matched files use Prettier code style!`. A crash looks like `[error] Plugin ... not found`.

- [ ] **Step 3: Commit all config files**

```bash
git add \
  eslint.config.mjs \
  .prettierrc.json \
  .prettierignore \
  .husky/pre-commit \
  package.json \
  package-lock.json
git commit -m "chore(tooling): install prettier, eslint, husky, lint-staged"
```

After this commit, **all subsequent commits will go through the pre-commit hook**. That's expected and fine.

---

## Task 8: Apply Prettier baseline — Commit #2

- [ ] **Step 1: Format the entire codebase**

```bash
npm run format
```

Expected: Prettier rewrites files. The output lists modified files. Tailwind classes in `.tsx` files will be sorted.

- [ ] **Step 2: Stage all changes**

```bash
git add -A
```

- [ ] **Step 3: Check what changed**

```bash
git diff --cached --stat
```

Expected: many `.ts` / `.tsx` / `.json` / `.css` files. Review if you see anything unexpected (e.g., a file you didn't expect Prettier to touch).

- [ ] **Step 4: Commit**

```bash
git commit -m "style: apply prettier baseline"
```

The pre-commit hook will run lint-staged: `eslint --fix` (may reorder imports) then `prettier --write` (no-op — already formatted). ESLint auto-fixes landing in this commit are acceptable; commit #4 will just have fewer changes. The conceptual split (format vs lint) is preserved in intent even if lint-staged blurs it slightly.

- [ ] **Step 5: Record the SHA**

```bash
git rev-parse HEAD
```

Copy the 40-character SHA. You will need it in the next task.

---

## Task 9: Add `.git-blame-ignore-revs` — Commit #3

- [ ] **Step 1: Create the file**

Create `.git-blame-ignore-revs` in the project root with this content (replace `<SHA>` with the 40-character hash from Task 8 Step 5):

```
# style: apply prettier baseline (2026-04-21)
<SHA>
```

Example (with a fake SHA):

```
# style: apply prettier baseline (2026-04-21)
a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

- [ ] **Step 2: Configure git to use the file locally**

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

This applies only to your local clone. GitHub picks it up automatically from the root.

- [ ] **Step 3: Verify git blame skips the prettier commit**

Pick any file that was modified in the prettier baseline commit, e.g. `src/app/layout.tsx`. Run:

```bash
git blame src/app/layout.tsx | head -10
```

Expected: lines show their original author commit (before the prettier baseline), not the `style: apply prettier baseline` commit SHA.

- [ ] **Step 4: Commit**

```bash
git add .git-blame-ignore-revs
git commit -m "chore: ignore prettier baseline in git blame"
```

---

## Task 10: Apply ESLint auto-fix — Commit #4

- [ ] **Step 1: Run ESLint with auto-fix**

```bash
npm run lint:fix
```

This auto-fixes:

- `import/order` — reorders import groups and adds blank lines between groups
- `unused-imports/no-unused-imports` — removes unused import statements

- [ ] **Step 2: Stage all changes**

```bash
git add -A
```

- [ ] **Step 3: Check what changed**

```bash
git diff --cached --stat
```

Expected: import reordering across several files. The diff should be clean (only import-order and blank-line changes).

- [ ] **Step 4: Commit**

```bash
git commit -m "fix(lint): apply auto-fixable eslint rules"
```

---

## Task 11: Fix remaining ESLint errors — Commit #5

- [ ] **Step 1: Run lint and capture output**

```bash
npm run lint 2>&1 | grep " error " | sort | uniq -c | sort -rn
```

This lists unique error patterns by frequency. Warnings are not your concern in this task.

- [ ] **Step 2: Fix each error type**

Common errors you may encounter and their fixes:

**`import/no-duplicates`** — two lines import from the same module path:

```ts
// before
import { foo } from '@/shared/lib/bar'
import { baz } from '@/shared/lib/bar'

// after
import { foo, baz } from '@/shared/lib/bar'
```

**`unused-imports/no-unused-imports`** (if not auto-fixed) — an import is never referenced:

```ts
// before
import { something } from 'somewhere' // never used

// after — delete the line entirely
```

**`@typescript-eslint/no-explicit-any`** — only triggered if typescript-eslint's recommended rules include it. Replace `any` with the proper type or `unknown`:

```ts
// before
function handle(data: any) { ... }

// after
function handle(data: unknown) { ... }
```

**`react/display-name`** — a component defined with `forwardRef` or as an anonymous arrow lacks a name. Add a `displayName`:

```ts
const MyComponent = React.forwardRef<HTMLDivElement, Props>((props, ref) => (
  <div ref={ref} {...props} />
))
MyComponent.displayName = 'MyComponent'
```

**`@next/next/no-img-element`** — if any `<img>` tag exists outside the filters-accordion branch (main doesn't have `MoveCardImage.tsx` yet, so this is unlikely). If it fires on a legitimate use (e.g. external images needing `onLoad`), suppress with:

```ts
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={src} alt={alt} onLoad={handleLoad} />
```

- [ ] **Step 3: Verify no errors remain**

```bash
npm run lint 2>&1 | grep " error " | wc -l
```

Expected: `0`. Warnings are fine.

- [ ] **Step 4: Run tests to confirm nothing broke**

```bash
npm test -- --run
```

Expected: `140 passed (140)`. If tests fail, the ESLint fixes accidentally changed logic — review the diff with `git diff` and revert unintended changes.

- [ ] **Step 5: Commit** (only if there were errors to fix; skip if Step 3 already returned 0)

```bash
git add -A
git commit -m "fix(lint): resolve remaining eslint errors"
```

---

## Task 12: Mark tech debt resolved — Commit #6

**Files:**

- Modify: `docs/todos.md`

- [ ] **Step 1: Strike through the Prettier + ESLint entry in todos.md**

Find the section:

```markdown
**Prettier + ESLint not configured**

- Проект без форматтера и линтера — стиль зависит от желания конкретного реализатора/ревьюера
- Fix: отдельной feature branch настроить Prettier (с Tailwind plugin для сортировки классов) + ESLint (Next.js config + typescript-eslint). Добавить npm scripts `lint`, `format`, и pre-commit hook (lint-staged + husky или simple-git-hooks)
```

Replace with:

```markdown
~~**Prettier + ESLint not configured**~~ ✅ Resolved (2026-04-21)

- Prettier 3 + `prettier-plugin-tailwindcss`, ESLint 9 flat config with `eslint-config-next/core-web-vitals` + TypeScript + import/unused-imports plugins, Husky 9 + lint-staged. Pre-commit auto-formats staged files and blocks on errors. `.git-blame-ignore-revs` masks the formatting baseline commit.
```

- [ ] **Step 2: Verify final state**

```bash
npm run lint && npm run format:check && npm run typecheck && npm test -- --run
```

Expected:

- `npm run lint` — exits 0
- `npm run format:check` — `All matched files use Prettier code style!`
- `npm run typecheck` — exits 0 (no output)
- `npm test -- --run` — `140 passed (140)`

- [ ] **Step 3: Commit**

```bash
git add docs/todos.md
git commit -m "docs(todos): mark prettier + eslint as resolved"
```

---

## Task 13: Open PR and merge to main

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feature/lint-format
```

- [ ] **Step 2: Open PR**

```bash
gh pr create \
  --title "chore: add prettier, eslint, husky, lint-staged" \
  --body "$(cat <<'EOF'
## Summary

- Prettier 3 with `prettier-plugin-tailwindcss` (Tailwind v4 CSS-first config via `tailwindStylesheet`)
- ESLint 9 flat config: `eslint-config-next/core-web-vitals` + `/typescript` + `eslint-plugin-import` (import ordering) + `eslint-plugin-unused-imports` (auto-remove)
- Husky 9 + lint-staged: pre-commit runs `eslint --fix` + `prettier --write` on staged files
- Legacy code onboarded in three commits (prettier baseline, auto-fix lint, manual errors) with `.git-blame-ignore-revs` for clean `git blame`

## Test plan

- [ ] `npm run lint` exits 0
- [ ] `npm run format:check` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] `npm test -- --run` → 140/140 passing
- [ ] Corrupt formatting in a file, `git add` + `git commit` → hook auto-fixes and commit succeeds
- [ ] Add `const x: any = 1` to a file, `git add` + `git commit` → hook blocks commit with ESLint error
EOF
)"
```

- [ ] **Step 3: Merge after review**

```bash
gh pr merge --squash
```

Or merge through the GitHub UI if you prefer.

- [ ] **Step 4: Remove worktree**

```bash
git worktree remove .worktrees/lint-format
git branch -d feature/lint-format
```
