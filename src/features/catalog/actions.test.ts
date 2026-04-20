import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    move: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '@/shared/lib/prisma'
import { getMovesAction } from './actions'

const mockTransaction = prisma.$transaction as ReturnType<typeof vi.fn>
const mockFindMany = prisma.move.findMany as ReturnType<typeof vi.fn>
const mockCount = prisma.move.count as ReturnType<typeof vi.fn>

const mockMoves = [
  { id: 'm1', title: 'Jade', difficulty: 'BEGINNER', category: 'SPINS', tags: [] },
  { id: 'm2', title: 'Iguana', difficulty: 'INTERMEDIATE', category: 'HOLDS', tags: [] },
]

beforeEach(() => vi.clearAllMocks())

describe('getMovesAction', () => {
  it('returns PaginatedResult shape with defaults page=1 pageSize=12', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2])
    const result = await getMovesAction()
    expect(result).toEqual({ items: mockMoves, total: 2, page: 1, pageSize: 12 })
  })

  it('applies skip=(page-1)*pageSize and take=pageSize for page 2', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 24])
    await getMovesAction({ page: 2, pageSize: 12 })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 12, take: 12 })
    )
  })

  it('filters by category', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1])
    await getMovesAction({ category: 'SPINS' })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ category: 'SPINS' }) })
    )
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ category: 'SPINS' }) })
    )
  })

  it('filters by difficulty', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1])
    await getMovesAction({ difficulty: 'BEGINNER' })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ difficulty: 'BEGINNER' }) })
    )
  })

  it('filters by search with case-insensitive title match', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2])
    await getMovesAction({ search: 'jade' })
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          title: { contains: 'jade', mode: 'insensitive' },
        }),
      })
    )
  })

  it('total reflects filtered count not all moves', async () => {
    mockTransaction.mockResolvedValue([[mockMoves[0]], 1])
    const result = await getMovesAction({ category: 'SPINS' })
    expect(result.total).toBe(1)
    expect(result.items).toHaveLength(1)
  })

  it('count uses same where clause as findMany', async () => {
    mockTransaction.mockResolvedValue([mockMoves, 2])
    await getMovesAction({ category: 'SPINS', difficulty: 'BEGINNER' })
    const findManyWhere = (mockFindMany.mock.calls[0][0] as { where: object }).where
    const countWhere = (mockCount.mock.calls[0][0] as { where: object }).where
    expect(findManyWhere).toEqual(countWhere)
  })
})
