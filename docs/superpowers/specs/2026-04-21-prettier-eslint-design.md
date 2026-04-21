# Prettier + ESLint Setup — Design

**Date:** 2026-04-21
**Status:** Draft
**Branch:** `feature/lint-format` (worktree: `.worktrees/lint-format/`)

## Goal

Introduce automated code formatting (Prettier) and linting (ESLint) to the project, with pre-commit enforcement, so that code style no longer depends on the individual implementer or reviewer.

## Context

- The project has no formatter or linter. Next.js 16 removed `next lint`, so the official path is the ESLint CLI with flat config (`eslint.config.mjs`).
- Existing code already follows an implicit style: single quotes, no semicolons, 2-space indent, trailing commas.
- All dependency versions in the project are pinned exactly (no `^` or `~`); new ones must follow the same convention via `--save-exact`.
- The catalog filters feature is currently in-flight on `feature/filters-accordion` and will not be touched by this work. That worktree is excluded from lint/format scope.

## Decisions (resolved during brainstorming)

| #   | Question                    | Choice                                                                                                                                                                                                                                 |
| --- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | What runs on `git commit`?  | Full pre-commit: `lint-staged` runs `eslint --fix` + `prettier --write` on staged files; errors block the commit.                                                                                                                      |
| 2   | Hook manager?               | `husky` (mainstream, documented, `.husky/` directory, installed via `prepare` script).                                                                                                                                                 |
| 3   | How to onboard legacy code? | Split commits: `style: apply prettier baseline` → `fix(lint): apply auto-fixable eslint rules` → `fix(lint): resolve remaining eslint errors`. The prettier-baseline SHA is added to `.git-blame-ignore-revs` so `git blame` skips it. |
| 4   | Prettier style?             | `singleQuote: true`, `semi: false`, `trailingComma: "all"`, `printWidth: 100`, `tabWidth: 2`, plugin `prettier-plugin-tailwindcss` (sorts Tailwind classes — important for Tailwind v4 to avoid merge conflicts).                      |
| 5   | ESLint rule scope?          | Standard: `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript` + `eslint-plugin-import` + `eslint-plugin-unused-imports` + `eslint-config-prettier/flat` last.                                                       |

## Packages to install (all `--save-exact`, `--save-dev`)

- `eslint`
- `eslint-config-next` — pulls in `@next/eslint-plugin-next`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `typescript-eslint`
- `eslint-config-prettier` — disables stylistic rules that would conflict with Prettier (flat-config entrypoint: `eslint-config-prettier/flat`)
- `eslint-plugin-import` — import ordering and hygiene
- `eslint-plugin-unused-imports` — auto-removes unused imports via `--fix`
- `prettier`
- `prettier-plugin-tailwindcss` — Tailwind class sorting
- `husky` — Git hooks manager
- `lint-staged` — runs linters on staged files

Exact versions will be pinned at install time (all latest stable as of 2026-04-21).

## Config files

### `eslint.config.mjs` (project root)

Flat-config array composed roughly like this:

```js
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';
import prettier from 'eslint-config-prettier/flat';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { import: importPlugin, 'unused-imports': unusedImports },
    rules: {
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
      ],
      // Disable the base rule in favor of unused-imports' rule
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  prettier, // must be last
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
    '.worktrees/**',
    'node_modules/**',
  ]),
]);
```

Notes:

- `prettier` from `eslint-config-prettier/flat` MUST come last — it disables stylistic rules from earlier configs.
- `.worktrees/**` is ignored so feature branches worked on in parallel worktrees are not linted by the main worktree.

### `.prettierrc.json`

```json
{
  "singleQuote": true,
  "semi": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### `.prettierignore`

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

### `.git-blame-ignore-revs`

Text file in project root. After the prettier-baseline commit is created, its SHA is appended with a comment header (format: one blank line, `# <commit message> (<date>)`, then the 40-char SHA).

### `package.json` — scripts & lint-staged

Add scripts:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "prepare": "husky"
  }
}
```

Add `lint-staged` config:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,mjs,cjs}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css,yml,yaml}": ["prettier --write"]
  }
}
```

### `.husky/pre-commit`

```
npx lint-staged
```

Created by `npx husky init` (writes default content, then edited to the line above).

## Rollout order (commits in `feature/lint-format`)

Numbered sequence — each step is its own commit so the diff and intent stay reviewable.

1. **`chore(tooling): install prettier, eslint, husky, lint-staged`** — adds dev dependencies, creates config files (`eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`), npm scripts, lint-staged config, `.husky/pre-commit`. Verify: `npm run format:check` and `npm run lint` execute without crashing (they may report violations — that's fine, next steps fix them).
2. **`style: apply prettier baseline`** — run `npm run format`, commit every resulting change in one go. No hand-edits here — only formatter output.
3. **`chore: ignore prettier baseline in git blame`** — create `.git-blame-ignore-revs` containing the SHA of commit #2 with the comment header.
4. **`fix(lint): apply auto-fixable eslint rules`** — run `npm run lint:fix`, commit every resulting change. Again, no hand-edits.
5. **`fix(lint): resolve remaining eslint errors`** — any errors that auto-fix couldn't handle get manual fixes. Warnings stay as they are (we are not chasing zero warnings at this stage).
6. **`docs(todos): mark prettier + eslint as resolved`** — strike through the tech-debt entry in `docs/todos.md`.

After step 1, pre-commit will already run on staged files; commits #2 onwards must `git add` _after_ running the formatter so `lint-staged` doesn't re-run on already-formatted content.

## Verification

After merge to `main`:

- [ ] `npm run lint` exits 0
- [ ] `npm run format:check` exits 0
- [ ] `npm run typecheck` exits 0
- [ ] `npm test -- --run` — 140/140 tests still passing
- [ ] Deliberately break formatting in a file, try to commit → pre-commit auto-fixes it and the commit proceeds
- [ ] Deliberately introduce an ESLint error, try to commit → pre-commit blocks the commit with the error message

## Out of scope

- **`feature/filters-accordion` worktree** — not touched. After filter work resumes and merges to main, prettier + eslint will apply to it naturally at that point.
- **CI integration** (GitHub Actions) — not set up yet; deferred until Stage 2E or later. The npm scripts leave this trivial to bolt on later (`npm run lint && npm run format:check && npm run typecheck`).
- **Stricter typescript-eslint rule sets** (`strict-type-checked`) — deferred; would require `parserOptions.project` setup and shake out extensive legacy findings.
- **Editor config / `.editorconfig`** — deferred; developers rely on IDE integrations pointed at the Prettier and ESLint configs.
- **Commit message linting** (commitlint) — not part of this work.

## Risks & mitigations

- **Husky pre-commit surprises contributors by auto-modifying files.** Mitigation: project has one developer today; behavior is well-documented; `lint-staged` stages formatter output before the commit is created (no silent unstaged changes).
- **`eslint-config-next/typescript` surfaces many warnings on existing code.** Mitigation: rollout step #5 explicitly resolves errors only; warnings are allowed to accumulate and will be cleaned up incrementally in future work.
- **`prettier-plugin-tailwindcss` re-sorts classes, creating a large diff.** Mitigation: this happens once during the baseline commit (step #2) and is covered by `.git-blame-ignore-revs`.
- **`.worktrees/` ignore means an in-flight feature branch can drift.** Mitigation: after any feature branch merges, a follow-up prettier/eslint pass on that code will happen via the pre-commit hook on subsequent edits, or a one-shot `npm run format && npm run lint:fix` can be run in the worktree.
