import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    move: { findUnique: vi.fn() },
    userFavourite: { findMany: vi.fn() },
  },
}));

import { prisma } from '@/shared/lib/prisma';
import { getMoveByIdAction } from './actions';

const mockFindUnique = prisma.move.findUnique as ReturnType<typeof vi.fn>;
const mockFavouriteFindMany = prisma.userFavourite.findMany as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('getMoveByIdAction', () => {
  const move = {
    id: 'move-1',
    title: 'Test Move',
    tags: [],
    stepsData: [{ text: 'Grip the pole', timestamp: 10 }],
  };

  it('returns null when move is not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await getMoveByIdAction('move-1', 'user-1');
    expect(result).toBeNull();
    expect(mockFavouriteFindMany).not.toHaveBeenCalled();
  });

  it('returns move with favourites when userId provided', async () => {
    mockFindUnique.mockResolvedValue(move);
    mockFavouriteFindMany.mockResolvedValue([{ id: 'fav-1', userId: 'user-1', moveId: 'move-1' }]);
    const result = await getMoveByIdAction('move-1', 'user-1');
    expect(mockFavouriteFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', moveId: 'move-1' },
    });
    expect(result?.favourites).toHaveLength(1);
  });

  it('returns move with empty favourites array when no userId', async () => {
    mockFindUnique.mockResolvedValue(move);
    const result = await getMoveByIdAction('move-1');
    expect(mockFavouriteFindMany).not.toHaveBeenCalled();
    expect(result?.favourites).toEqual([]);
  });

  it('returns stepsData as StepItem array', async () => {
    mockFindUnique.mockResolvedValue(move);
    const result = await getMoveByIdAction('move-1');
    expect(result?.stepsData).toEqual([{ text: 'Grip the pole', timestamp: 10 }]);
  });

  it('returns empty stepsData when DB value is not an array', async () => {
    mockFindUnique.mockResolvedValue({ ...move, stepsData: null });
    const result = await getMoveByIdAction('move-1');
    expect(result?.stepsData).toEqual([]);
  });

  it('filters out invalid entries from stepsData', async () => {
    mockFindUnique.mockResolvedValue({
      ...move,
      stepsData: [
        { text: 'Valid step' },
        { timestamp: 10 },
        null,
        'string entry',
        42,
        { text: 'Another valid', timestamp: 5 },
        { text: 'String timestamp', timestamp: 'not-a-number' },
      ],
    });
    const result = await getMoveByIdAction('move-1');
    expect(result?.stepsData).toEqual([
      { text: 'Valid step' },
      { text: 'Another valid', timestamp: 5 },
    ]);
  });
});
