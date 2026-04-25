import bcrypt from 'bcryptjs';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-auth', () => ({
  default: (_config: unknown) => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));
vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

import { prisma } from '@/shared/lib/prisma';

import { authConfig } from './auth';

const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockCompare = bcrypt.compare as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('authConfig', () => {
  it('includes google, facebook, and credentials providers', () => {
    const ids = authConfig.providers.map((p: { id: string }) => p.id);
    expect(ids).toContain('google');
    expect(ids).toContain('facebook');
    expect(ids).toContain('credentials');
  });

  it('uses jwt session strategy', () => {
    expect(authConfig.session?.strategy).toBe('jwt');
  });
});

describe('jwt callback', () => {
  const getJwt = () =>
    authConfig.callbacks?.jwt as (params: {
      token: Record<string, unknown>;
      user?: Record<string, unknown>;
      trigger?: string;
      session?: unknown;
    }) => Record<string, unknown>;

  it('sets name from firstName and lastName on sign-in', async () => {
    const jwt = getJwt();
    const token = await jwt({
      token: {},
      user: { firstName: 'Alice', lastName: 'Pole', role: 'USER' },
    });
    expect(token.name).toBe('Alice Pole');
  });

  it('sets name to null when firstName and lastName are empty on sign-in', async () => {
    const jwt = getJwt();
    const token = await jwt({
      token: {},
      user: { firstName: null, lastName: null, role: 'USER' },
    });
    expect(token.name).toBeNull();
  });

  it('updates token.name when trigger is update and session.name is provided', async () => {
    const jwt = getJwt();
    const token = await jwt({
      token: { name: 'Old Name' },
      trigger: 'update',
      session: { name: 'New Name' },
    });
    expect(token.name).toBe('New Name');
  });

  it('leaves token.name unchanged when trigger is update but session.name is absent', async () => {
    const jwt = getJwt();
    const token = await jwt({
      token: { name: 'Old Name' },
      trigger: 'update',
      session: {},
    });
    expect(token.name).toBe('Old Name');
  });
});

describe('authorize', () => {
  const getAuthorize = () => {
    const provider = authConfig.providers.find(
      (p: { id: string }) => p.id === 'credentials',
    ) as unknown as { options: { authorize: (creds: Record<string, string>) => Promise<unknown> } };
    return provider.options.authorize;
  };

  it('returns null if credentials are missing', async () => {
    const authorize = getAuthorize();
    const result = await authorize({});
    expect(result).toBeNull();
  });

  it('throws if user not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const authorize = getAuthorize();
    await expect(authorize({ email: 'a@b.com', password: 'pass' })).rejects.toThrow(
      'find your account',
    );
  });

  it('throws if emailVerified is null', async () => {
    mockFindUnique.mockResolvedValue({ id: '1', password: 'hashed', emailVerified: null });
    const authorize = getAuthorize();
    await expect(authorize({ email: 'a@b.com', password: 'pass' })).rejects.toThrow(
      'Please verify your email first',
    );
  });

  it('returns null if password does not match', async () => {
    mockFindUnique.mockResolvedValue({ id: '1', password: 'hashed', emailVerified: new Date() });
    mockCompare.mockResolvedValue(false);
    const authorize = getAuthorize();
    const result = await authorize({ email: 'a@b.com', password: 'wrong' });
    expect(result).toBeNull();
  });

  it('returns user if credentials are valid and email is verified', async () => {
    const user = { id: '1', password: 'hashed', emailVerified: new Date() };
    mockFindUnique.mockResolvedValue(user);
    mockCompare.mockResolvedValue(true);
    const authorize = getAuthorize();
    const result = await authorize({ email: 'a@b.com', password: 'correct' });
    expect(result).toEqual(user);
  });
});
