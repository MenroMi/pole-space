# Project TODOs

## Security

### Auth guards in Server Actions (before connecting to routes)

**`src/features/admin/actions.ts`**
- `createMoveAction` and `deleteMoveAction` have no role check
- Fix: add `auth()` from `@/shared/lib/auth` + verify `session.user.role === 'ADMIN'` at the top of each action
- Priority: must fix before admin routes go live

**`src/features/profile/actions.ts`**
- `updateProgressAction` takes `userId` as a parameter — caller could pass any userId
- Fix: remove `userId` param, get it from `auth()` session instead
- Priority: must fix before profile routes go live

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

## Infrastructure

~~**Neon DB not connected**~~ ✅ Resolved — DB connected, schema pushed (2026-04-19)
