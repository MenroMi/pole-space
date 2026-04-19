'use server'
import { prisma } from '@/shared/lib/prisma'
import type { MoveDetail } from './types'

export async function getMoveByIdAction(id: string): Promise<MoveDetail | null> {
  return prisma.move.findUnique({
    where: { id },
    include: { tags: true, progress: true },
  })
}
