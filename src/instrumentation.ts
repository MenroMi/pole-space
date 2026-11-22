export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { warnIfRatelimitDisabled } = await import('@/shared/lib/ratelimit');
  warnIfRatelimitDisabled();
}
