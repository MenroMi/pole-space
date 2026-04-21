'use server'
import { auth } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import type { LearnStatus } from '@/shared/types'

import type { ProgressWithMove } from './types'

async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('Unauthorized')
  }
  return session.user.id
}

export async function getUserProgressAction(): Promise<ProgressWithMove[]> {
  const userId = await requireAuth()
  return prisma.userProgress.findMany({
    where: { userId },
    include: { move: true },
  })
}

export async function updateProgressAction(moveId: string, status: LearnStatus) {
  const userId = await requireAuth()
  return prisma.userProgress.upsert({
    where: { userId_moveId: { userId, moveId } },
    create: { userId, moveId, status },
    update: { status },
  })
}
