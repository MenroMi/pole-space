'use server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/shared/lib/prisma';
import type { MoveFilters, PaginatedResult } from '@/shared/types';
import { Difficulty, PoleType } from '@/shared/types/enums';

const moveFiltersSchema = z.object({
  poleTypes: z.array(z.nativeEnum(PoleType)).optional(),
  difficulty: z.array(z.nativeEnum(Difficulty)).optional(),
  search: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

import type { MoveWithTags } from './types';

const ALL_POLE_TYPES = Object.values(PoleType);

function buildPoleTypeConditions(selected: PoleType[]): Prisma.MoveWhereInput[] {
  if (!selected.length) return [];
  const excluded = ALL_POLE_TYPES.filter((t) => !selected.includes(t));
  return [
    { poleTypes: { hasEvery: selected } },
    ...excluded.map((t) => ({ NOT: { poleTypes: { has: t } } })),
  ];
}

function buildTagConditions(tags: string[]): Prisma.MoveWhereInput[] {
  return tags.map((tag) => ({ tags: { some: { name: tag } } }));
}

export async function getMovesAction(
  filters: MoveFilters = {},
): Promise<PaginatedResult<MoveWithTags>> {
  const parsed = moveFiltersSchema.safeParse(filters);
  if (!parsed.success) throw new Error('Invalid filters');
  const page = parsed.data.page ?? 1;
  const pageSize = parsed.data.pageSize ?? 12;

  const andConditions = [
    ...buildPoleTypeConditions(parsed.data.poleTypes ?? []),
    ...buildTagConditions(parsed.data.tags ?? []),
  ];

  const where = {
    ...(parsed.data.difficulty?.length && { difficulty: { in: parsed.data.difficulty } }),
    ...(parsed.data.search && {
      title: { contains: parsed.data.search, mode: 'insensitive' as const },
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
