import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

vi.mock('./auth', () => ({ auth: vi.fn() }));

import { auth } from './auth';
import { prisma } from './prisma';
import { getActiveSessionUser } from './session-user';

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('getActiveSessionUser', () => {
  it('returns null without a session and skips the DB', async () => {
    mockAuth.mockResolvedValue(null);
    expect(await getActiveSessionUser()).toBeNull();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('returns null when the session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: {} });
    expect(await getActiveSessionUser()).toBeNull();
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('returns null when the user no longer exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } });
    mockUserFindUnique.mockResolvedValue(null);
    expect(await getActiveSessionUser()).toBeNull();
  });

  it('returns null when the user is blocked', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', blockedAt: null } });
    mockUserFindUnique.mockResolvedValue({ role: 'USER', blockedAt: new Date() });
    expect(await getActiveSessionUser()).toBeNull();
  });

  it('returns the DB role, not the JWT role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ADMIN' } });
    mockUserFindUnique.mockResolvedValue({ role: 'USER', blockedAt: null });
    expect(await getActiveSessionUser()).toEqual({ id: 'user-1', role: 'USER' });
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { role: true, blockedAt: true },
    });
  });
});
