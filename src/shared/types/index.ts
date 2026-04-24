// src/shared/types/index.ts
import type { Role, LearnStatus } from '@prisma/client';

import type { Difficulty, PoleType } from './enums';

export type { Role, LearnStatus };
export type { Category, Difficulty, PoleType } from './enums';

export interface UserSession {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: Role;
}

export interface MoveFilters {
  poleType?: PoleType[];
  difficulty?: Difficulty[];
  search?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
