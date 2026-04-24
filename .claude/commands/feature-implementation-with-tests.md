---
name: feature-implementation-with-tests
description: Workflow command scaffold for feature-implementation-with-tests in pole-dance-catalog.
allowed_tools: ['Bash', 'Read', 'Write', 'Grep', 'Glob']
---

# /feature-implementation-with-tests

Use this workflow when working on **feature-implementation-with-tests** in `pole-dance-catalog`.

## Goal

Implements a new feature or utility along with its corresponding test file.

## Common Files

- `src/features/auth/lib/validation.ts`
- `src/features/auth/lib/validation.test.ts`
- `src/features/auth/lib/tokens.ts`
- `src/features/auth/lib/tokens.test.ts`
- `src/features/auth/lib/email.ts`
- `src/features/auth/lib/email.test.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update the implementation file (e.g., utility, action, component).
- Create or update the corresponding test file for the implementation.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.
