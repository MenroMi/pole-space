import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    move: { findUnique: vi.fn() },
    userFavourite: { findMany: vi.fn() },
  },
}));

vi.mock('@/shared/lib/auth', () => ({
  auth: vi.fn(),
}));

import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';
import { getMoveByIdAction } from './actions';

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockFindUnique = prisma.move.findUnique as ReturnType<typeof vi.fn>;
const mockFavouriteFindMany = prisma.userFavourite.findMany as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('getMoveByIdAction', () => {
  const session = { user: { id: 'user-1' } };
  const move = { id: 'move-1', title: 'Test Move', tags: [] };

  it('returns null when move is not found', async () => {
    mockAuth.mockResolvedValue(session);
    mockFindUnique.mockResolvedValue(null);
    const result = await getMoveByIdAction('move-1');
    expect(result).toBeNull();
    expect(mockFavouriteFindMany).not.toHaveBeenCalled();
  });

  it('returns move with favourites when authenticated', async () => {
    mockAuth.mockResolvedValue(session);
    mockFindUnique.mockResolvedValue(move);
    mockFavouriteFindMany.mockResolvedValue([{ id: 'fav-1', userId: 'user-1', moveId: 'move-1' }]);
    const result = await getMoveByIdAction('move-1');
    expect(mockFavouriteFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', moveId: 'move-1' },
    });
    expect(result?.favourites).toHaveLength(1);
  });

  it('returns move with empty favourites array when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null);
    mockFindUnique.mockResolvedValue(move);
    const result = await getMoveByIdAction('move-1');
    expect(mockFavouriteFindMany).not.toHaveBeenCalled();
    expect(result?.favourites).toEqual([]);
  });
});
