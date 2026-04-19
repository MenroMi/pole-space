'use server'
import { prisma } from '@/shared/lib/prisma'
import type { LearnStatus } from '@/shared/types'
import type { ProgressWithMove } from './types'

export async function getUserProgressAction(userId: string): Promise<ProgressWithMove[]> {
  return prisma.userProgress.findMany({
    where: { userId },
    include: { move: true },
  })
}

export async function updateProgressAction(
  userId: string,
  moveId: string,
  status: LearnStatus
) {
  return prisma.userProgress.upsert({
    where: { userId_moveId: { userId, moveId } },
    create: { userId, moveId, status },
    update: { status },
  })
}
