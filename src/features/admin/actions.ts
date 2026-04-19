'use server'
import { prisma } from '@/shared/lib/prisma'
import type { CreateMoveInput } from './types'

export async function createMoveAction(input: CreateMoveInput) {
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
  return prisma.move.delete({ where: { id } })
}
