// src/shared/types/index.ts
import type { Role, Difficulty, Category, LearnStatus } from '@prisma/client'

export type { Role, Difficulty, Category, LearnStatus }

export interface UserSession {
  id: string
  email: string
  name: string | null
  image: string | null
  role: Role
}

export interface MoveFilters {
  category?: Category
  difficulty?: Difficulty
  search?: string
  tags?: string[]
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
