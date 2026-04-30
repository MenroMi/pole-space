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

function makeRatelimit(tokens: number, window: Duration, prefix: string) {
  if (!redis) {
    return { limit: async () => ({ success: true as const }) };
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    prefix,
  });
}

export const geocodeRatelimit = makeRatelimit(20, '1 m', 'rl:geocode');
export const signinRatelimit = makeRatelimit(10, '15 m', 'rl:signin');
export const signupRatelimit = makeRatelimit(5, '1 h', 'rl:signup');
export const resendRatelimit = makeRatelimit(5, '1 h', 'rl:resend');
export const forgotPasswordRatelimit = makeRatelimit(5, '1 h', 'rl:forgotpw');
export const verifyRatelimit = makeRatelimit(10, '15 m', 'rl:verify');
