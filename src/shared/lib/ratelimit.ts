import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type Duration = Parameters<typeof Ratelimit.slidingWindow>[1];

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

type RatelimitResult = { success: boolean; unavailable?: true };

type RatelimitOptions = {
  /** Reject requests while Redis is down instead of letting them through unthrottled. */
  failClosed: boolean;
};

function makeRatelimit(
  tokens: number,
  window: Duration,
  prefix: string,
  { failClosed }: RatelimitOptions,
) {
  if (!redis) {
    return { limit: async (_identifier: string): Promise<RatelimitResult> => ({ success: true }) };
  }
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix,
  });
  return {
    async limit(identifier: string): Promise<RatelimitResult> {
      try {
        const { success } = await ratelimit.limit(identifier);
        return { success };
      } catch (error) {
        console.error(`[ratelimit] ${prefix}: Redis unavailable`, error);
        return failClosed ? { success: false, unavailable: true } : { success: true };
      }
    },
  };
}

/** Called once at server start (see `src/instrumentation.ts`). */
export function warnIfRatelimitDisabled() {
  if (!redis && process.env.NODE_ENV === 'production') {
    console.error(
      '[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set: rate limiting is disabled',
    );
  }
}

// Auth flows fail closed: unthrottled sign-in or reset emails are worse than a clear "try later".
const AUTH = { failClosed: true };

export const geocodeRatelimit = makeRatelimit(20, '1 m', 'rl:geocode', { failClosed: false });
export const signinRatelimit = makeRatelimit(10, '15 m', 'rl:signin', AUTH);
export const signupRatelimit = makeRatelimit(5, '1 h', 'rl:signup', AUTH);
export const resendRatelimit = makeRatelimit(5, '1 h', 'rl:resend', AUTH);
export const forgotPasswordRatelimit = makeRatelimit(5, '1 h', 'rl:forgotpw', AUTH);
export const verifyRatelimit = makeRatelimit(10, '15 m', 'rl:verify', AUTH);
