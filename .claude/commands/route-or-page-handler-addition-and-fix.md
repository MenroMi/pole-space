---
name: route-or-page-handler-addition-and-fix
description: Workflow command scaffold for route-or-page-handler-addition-and-fix in pole-dance-catalog.
allowed_tools: ['Bash', 'Read', 'Write', 'Grep', 'Glob']
---

# /route-or-page-handler-addition-and-fix

Use this workflow when working on **route-or-page-handler-addition-and-fix** in `pole-dance-catalog`.

## Goal

Adds or updates an API route or page handler, then follows up with a fix or enhancement in a separate commit.

## Common Files

- `src/app/api/auth/verify/route.ts`
- `src/app/(auth)/verify-email/page.tsx`
- `src/proxy.ts`
- `src/features/auth/components/LoginForm.tsx`
- `src/features/auth/components/LoginForm.test.tsx`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update a route or page handler file.
- Shortly after, make a fix or enhancement to the same file.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.
