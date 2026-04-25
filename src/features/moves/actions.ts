'use server';
import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

import type { MoveDetail } from './types';

export async function getMoveByIdAction(id: string): Promise<MoveDetail | null> {
  const session = await auth();
  const userId = session?.user?.id;

  const move = await prisma.move.findUnique({
    where: { id },
    include: { tags: true },
  });

  if (!move) return null;

  const favourites = userId
    ? await prisma.userFavourite.findMany({ where: { userId, moveId: id } })
    : [];

  return { ...move, favourites };
}
