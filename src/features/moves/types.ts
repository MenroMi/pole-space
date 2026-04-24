import type { Move, Tag, UserProgress } from '@prisma/client';

export type MoveDetail = Move & { tags: Tag[]; progress: UserProgress[] };
