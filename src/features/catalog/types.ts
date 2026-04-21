import type { Move, Tag } from '@prisma/client';

import type { MoveFilters, PaginatedResult } from '@/shared/types';

export type { MoveFilters, PaginatedResult };
export type MoveWithTags = Move & { tags: Tag[] };
