import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockLimit = vi.fn();

vi.mock('@upstash/redis', () => ({ Redis: vi.fn() }));
vi.mock('@upstash/ratelimit', () => {
  const Ratelimit = vi.fn(function (this: { limit: typeof mockLimit }) {
    this.limit = mockLimit;
  });
  Object.assign(Ratelimit, { slidingWindow: vi.fn() });
  return { Ratelimit };
});

// The module reads Upstash env at import time, so each test re-imports it.
async function loadModule() {
  vi.resetModules();
  return import('./ratelimit');
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mockLimit.mockReset();
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  consoleError.mockRestore();
});

describe('ratelimit with Upstash configured', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://example.upstash.io');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token');
  });

  it('returns the limiter verdict', async () => {
    mockLimit.mockResolvedValue({ success: false });
    const { signinRatelimit } = await loadModule();
    await expect(signinRatelimit.limit('a@b.c')).resolves.toEqual({ success: false });
  });

  it('fails open and logs when Redis throws', async () => {
    mockLimit.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));
    const { forgotPasswordRatelimit } = await loadModule();
    await expect(forgotPasswordRatelimit.limit('1.2.3.4')).resolves.toEqual({ success: true });
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('rl:forgotpw'),
      expect.any(Error),
    );
  });

  it('does not warn about missing config in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { warnIfRatelimitDisabled } = await loadModule();
    warnIfRatelimitDisabled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('ratelimit without Upstash env', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  });

  it('allows every request without touching Redis', async () => {
    const { signupRatelimit } = await loadModule();
    await expect(signupRatelimit.limit('1.2.3.4')).resolves.toEqual({ success: true });
    expect(mockLimit).not.toHaveBeenCalled();
  });

  it('logs an error in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { warnIfRatelimitDisabled } = await loadModule();
    warnIfRatelimitDisabled();
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('UPSTASH_REDIS_REST_URL'));
  });

  it('stays quiet in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { warnIfRatelimitDisabled } = await loadModule();
    warnIfRatelimitDisabled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
