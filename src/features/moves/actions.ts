'use server';
import { prisma } from '@/shared/lib/prisma';

import type { MoveDetail, StepItem } from './types';

export async function getMoveByIdAction(id: string, userId?: string): Promise<MoveDetail | null> {
  const move = await prisma.move.findUnique({
    where: { id },
    include: { tags: true },
  });

  if (!move) return null;

  const favourites = userId
    ? await prisma.userFavourite.findMany({ where: { userId, moveId: id } })
    : [];

  const stepsData = (Array.isArray(move.stepsData) ? move.stepsData : []).filter(
    (s): s is StepItem => typeof s === 'object' && s !== null && typeof s.text === 'string',
  );

  return { ...move, favourites, stepsData };
}
