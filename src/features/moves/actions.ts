'use server';
import { prisma } from '@/shared/lib/prisma';

import type { MoveDetail, StepItem } from './types';

export async function getMoveByIdAction(id: string, userId?: string): Promise<MoveDetail | null> {
  const move = await prisma.move.findUnique({
    where: { id },
    include: { tags: true },
  });

  if (!move) return null;

  const [favourites, progressRecord] = await Promise.all([
    userId ? prisma.userFavourite.findMany({ where: { userId, moveId: id } }) : Promise.resolve([]),
    userId
      ? prisma.userProgress.findFirst({ where: { userId, moveId: id } })
      : Promise.resolve(null),
  ]);

  const stepsData = (Array.isArray(move.stepsData) ? move.stepsData : []).filter(
    (s): s is StepItem => {
      if (typeof s !== 'object' || s === null || Array.isArray(s)) return false;
      const obj = s as Record<string, unknown>;
      return (
        typeof obj.text === 'string' &&
        (obj.timestamp === undefined || typeof obj.timestamp === 'number')
      );
    },
  );

  return {
    ...move,
    favourites,
    stepsData,
    currentProgress: progressRecord?.status ?? null,
  };
}

export async function getRelatedMovesAction(tagIds: string[], excludeId: string) {
  return prisma.move.findMany({
    where: { id: { not: excludeId }, tags: { some: { id: { in: tagIds } } } },
    select: { id: true, title: true, difficulty: true, imageUrl: true, youtubeUrl: true },
    take: 4,
  });
}
