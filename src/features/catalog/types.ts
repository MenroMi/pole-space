import type { Move, Tag } from '@prisma/client'
import type { MoveFilters } from '@/shared/types'

export type { MoveFilters }
export type MoveWithTags = Move & { tags: Tag[] }
