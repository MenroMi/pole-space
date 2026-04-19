'use server'
import { prisma } from '@/shared/lib/prisma'
import type { MoveFilters } from '@/shared/types'
import type { MoveWithTags } from './types'

export async function getMovesAction(filters: MoveFilters = {}): Promise<MoveWithTags[]> {
  return prisma.move.findMany({
    where: {
      ...(filters.category && { category: filters.category }),
      ...(filters.difficulty && { difficulty: filters.difficulty }),
      ...(filters.search && {
        title: { contains: filters.search, mode: 'insensitive' },
      }),
    },
    include: { tags: true },
    orderBy: { createdAt: 'desc' },
  })
}
