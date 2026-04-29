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
  { id: 'm1', title: 'Jade', difficulty: 'BEGINNER', poleTypes: ['STATIC'], tags: [] },
  { id: 'm2', title: 'Iguana', difficulty: 'INTERMEDIATE', poleTypes: ['SPIN'], tags: [] },
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

  it('does not add AND when poleTypes is empty', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ poleTypes: [] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ AND: expect.anything() }),
      }),
    );
  });

  it('filters STATIC-only: hasEvery STATIC + NOT has SPIN', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1]);
    await getMovesAction({ poleTypes: ['STATIC'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { poleTypes: { hasEvery: ['STATIC'] } },
            { NOT: { poleTypes: { has: 'SPIN' } } },
          ]),
        }),
      }),
    );
  });

  it('filters SPIN-only: hasEvery SPIN + NOT has STATIC', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[1]], 1]);
    await getMovesAction({ poleTypes: ['SPIN'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { poleTypes: { hasEvery: ['SPIN'] } },
            { NOT: { poleTypes: { has: 'STATIC' } } },
          ]),
        }),
      }),
    );
  });

  it('filters STATIC+SPIN (universal): hasEvery both, no exclusions', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ poleTypes: ['STATIC', 'SPIN'] });
    const call = mockFindMany.mock.calls[0][0] as { where: { AND: object[] } };
    expect(call.where.AND).toContainEqual({ poleTypes: { hasEvery: ['STATIC', 'SPIN'] } });
    expect(call.where.AND).not.toContainEqual(expect.objectContaining({ NOT: expect.anything() }));
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

  it('filters tags with AND: each tag must be present', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1]);
    await getMovesAction({ tags: ['aerial', 'flexibility'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { tags: { some: { name: 'aerial' } } },
            { tags: { some: { name: 'flexibility' } } },
          ]),
        }),
      }),
    );
  });

  it('single tag produces single AND condition', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1]);
    await getMovesAction({ tags: ['aerial'] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ tags: { some: { name: 'aerial' } } }]),
        }),
      }),
    );
  });

  it('does not add AND when tags is empty', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ tags: [] });
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ AND: expect.anything() }),
      }),
    );
  });

  it('merges poleTypes and tags into a single AND array', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1]);
    await getMovesAction({ poleTypes: ['STATIC'], tags: ['aerial'] });
    const call = mockFindMany.mock.calls[0][0] as { where: { AND: object[] } };
    expect(call.where.AND).toContainEqual({ poleTypes: { hasEvery: ['STATIC'] } });
    expect(call.where.AND).toContainEqual({ tags: { some: { name: 'aerial' } } });
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
    const result = await getMovesAction({ poleTypes: ['STATIC'] });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it('count uses same where clause as findMany', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2]);
    await getMovesAction({ poleTypes: ['STATIC'], difficulty: ['BEGINNER'] });
    const findManyWhere = (mockFindMany.mock.calls[0][0] as { where: object }).where;
    const countWhere = (mockCount.mock.calls[0][0] as { where: object }).where;
    expect(findManyWhere).toEqual(countWhere);
  });
});

describe('getTagsAction', () => {
  it('returns tags ordered by name', async () => {
    const mockTags = [
      { id: 'tag-1', name: 'aerial', color: '#3b82f6' },
      { id: 'tag-2', name: 'flexibility', color: '#a855f7' },
    ];
    mockTagFindMany.mockResolvedValue(mockTags);
    const result = await getTagsAction();
    expect(result).toEqual(mockTags);
    expect(mockTagFindMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });

  it('returns empty array when no tags exist', async () => {
    mockTagFindMany.mockResolvedValue([]);
    const result = await getTagsAction();
    expect(result).toEqual([]);
  });

  it('includes color field in returned shape', async () => {
    mockTagFindMany.mockResolvedValue([{ id: 'tag-1', name: 'aerial', color: '#3b82f6' }]);
    const [tag] = await getTagsAction();
    expect(tag).toHaveProperty('color');
  });
});
