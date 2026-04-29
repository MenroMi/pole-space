'use server';
import { prisma } from '@/shared/lib/prisma';
import type { MoveFilters, PaginatedResult, PoleType } from '@/shared/types';

import type { MoveWithTags } from './types';

const ALL_POLE_TYPES = ['STATIC', 'SPIN'] as const;

function buildPoleTypeConditions(selected: PoleType[]): object[] {
  if (!selected.length) return [];
  const excluded = ALL_POLE_TYPES.filter((t) => !selected.includes(t));
  return [
    { poleTypes: { hasEvery: selected } },
    ...excluded.map((t) => ({ NOT: { poleTypes: { has: t } } })),
  ];
}

function buildTagConditions(tags: string[]): object[] {
  return tags.map((tag) => ({ tags: { some: { name: tag } } }));
}

export async function getMovesAction(
  filters: MoveFilters = {},
): Promise<PaginatedResult<MoveWithTags>> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;

  const andConditions = [
    ...buildPoleTypeConditions(filters.poleTypes ?? []),
    ...buildTagConditions(filters.tags ?? []),
  ];

  const where = {
    ...(filters.difficulty?.length && { difficulty: { in: filters.difficulty } }),
    ...(filters.search && {
      title: { contains: filters.search, mode: 'insensitive' as const },
    }),
    ...(andConditions.length && { AND: andConditions }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.move.findMany({
      where,
      include: { tags: true },
      orderBy: { title: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.move.count({ where }),
  ]);

  return { items: items as MoveWithTags[], total, page, pageSize };
}

export async function getTagsAction(): Promise<
  { id: string; name: string; color: string | null }[]
> {
  return prisma.tag.findMany({ orderBy: { name: 'asc' } });
}
