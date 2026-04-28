'use server';
import type { Category } from '@prisma/client';

import { prisma } from '@/shared/lib/prisma';

import type { MoveDetail, StepItem } from './types';

export async function getMoveByIdAction(id: string, userId?: string): Promise<MoveDetail | null> {
  const move = await prisma.move.findUnique({
    where: { id },
  });

  if (!move) return null;

  const favourites = userId
    ? await prisma.userFavourite.findMany({ where: { userId, moveId: id } })
    : [];

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

  return { ...move, favourites, stepsData };
}

export async function getRelatedMovesAction(category: Category, excludeId: string) {
  return prisma.move.findMany({
    where: { category, id: { not: excludeId } },
    select: { id: true, title: true, difficulty: true, imageUrl: true, youtubeUrl: true },
    take: 4,
  });
}
