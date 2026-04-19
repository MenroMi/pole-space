'use server'
import { auth } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import type { CreateMoveInput } from './types'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }
}

export async function createMoveAction(input: CreateMoveInput) {
  await requireAdmin()
  return prisma.move.create({
    data: {
      title: input.title,
      description: input.description,
      difficulty: input.difficulty,
      category: input.category,
      youtubeUrl: input.youtubeUrl,
      imageUrl: input.imageUrl,
      tags: {
        connectOrCreate: (input.tags ?? []).map((name) => ({
          where: { name },
          create: { name },
        })),
      },
    },
  })
}

export async function deleteMoveAction(id: string) {
  await requireAdmin()
  return prisma.move.delete({ where: { id } })
}
