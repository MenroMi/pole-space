'use server'
import { prisma } from '@/shared/lib/prisma'
import type { MoveFilters, PaginatedResult } from '@/shared/types'

import type { MoveWithTags } from './types'

export async function getMovesAction(
  filters: MoveFilters = {},
): Promise<PaginatedResult<MoveWithTags>> {
  const page = filters.page ?? 1
  const pageSize = filters.pageSize ?? 12

  const where = {
    ...(filters.category && { category: filters.category }),
    ...(filters.difficulty && { difficulty: filters.difficulty }),
    ...(filters.search && {
      title: { contains: filters.search, mode: 'insensitive' as const },
    }),
  }

  const [items, total] = await prisma.$transaction([
    prisma.move.findMany({
      where,
      include: { tags: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.move.count({ where }),
  ])

  return { items: items as MoveWithTags[], total, page, pageSize }
}
