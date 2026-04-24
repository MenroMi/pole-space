import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    move: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    tag: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/shared/lib/prisma';

import { getMovesAction, getTagsAction } from './actions';

const mockTransaction = prisma.$transaction as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.move.findMany as ReturnType<typeof vi.fn>;
const mockCount = prisma.move.count as ReturnType<typeof vi.fn>;
const mockTagFindMany = prisma.tag.findMany as ReturnType<typeof vi.fn>;

const mockMoves = [
  { id: 'm1', title: 'Jade', difficulty: 'BEGINNER', poleType: 'STATIC', tags: [] },
  { id: 'm2', title: 'Iguana', difficulty: 'INTERMEDIATE', poleType: 'SPIN', tags: [] },
];

beforeEach(() => vi.clearAllMocks());

describe('getMovesAction', () => {
  it('returns PaginatedResult shape with defaults page=1 pageSize=12', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    const result = await getMovesAction();
    expect(result).toEqual({ items: mockMoves, total: 2, page: 1, pageSize: 12 });
  });

  it('applies skip=(page-1)*pageSize and take=pageSize for page 2', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 24]);
    await getMovesAction({ page: 2, pageSize: 12 });
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 12, take: 12 }));
  });

  it('filters by poleType with { in: [...] }', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1]);
    await getMovesAction({ poleType: ['STATIC'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ poleType: { in: ['STATIC'] } }),
      }),
    );
  });

  it('filters by multiple poleTypes (OR logic)', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ poleType: ['STATIC', 'SPIN'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ poleType: { in: ['STATIC', 'SPIN'] } }),
      }),
    );
  });

  it('does not add poleType to where when array is empty', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ poleType: [] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ poleType: expect.anything() }),
      }),
    );
  });

  it('filters by difficulty with { in: [...] }', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1]);
    await getMovesAction({ difficulty: ['BEGINNER'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ difficulty: { in: ['BEGINNER'] } }),
      }),
    );
  });

  it('filters by multiple difficulties (OR logic)', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ difficulty: ['BEGINNER', 'INTERMEDIATE'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ difficulty: { in: ['BEGINNER', 'INTERMEDIATE'] } }),
      }),
    );
  });

  it('does not add difficulty to where when array is empty', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ difficulty: [] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ difficulty: expect.anything() }),
      }),
    );
  });

  it('filters by tags with { some: { name: { in: [...] } } }', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1]);
    await getMovesAction({ tags: ['aerial', 'flexibility'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tags: { some: { name: { in: ['aerial', 'flexibility'] } } },
        }),
      }),
    );
  });

  it('filters by search with case-insensitive title match', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ search: 'jade' });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          title: { contains: 'jade', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('total reflects filtered count not all moves', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1]);
    const result = await getMovesAction({ poleType: ['STATIC'] });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it('count uses same where clause as findMany', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ poleType: ['STATIC'], difficulty: ['BEGINNER'] });
    const findManyWhere = (mockFindMany.mock.calls[0][0] as { where: object }).where;
    const countWhere = (mockCount.mock.calls[0][0] as { where: object }).where;
    expect(findManyWhere).toEqual(countWhere);
  });
});

describe('getTagsAction', () => {
  it('returns tags ordered by name', async () => {
    const mockTags = [
      { id: 'tag-1', name: 'aerial' },
      { id: 'tag-2', name: 'flexibility' },
    ];
    mockTagFindMany.mockResolvedValue(mockTags);
    const result = await getTagsAction();
    expect(result).toEqual(mockTags);
    expect(mockTagFindMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });
});
