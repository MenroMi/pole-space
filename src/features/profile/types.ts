import type { UserProgress, Move } from '@prisma/client';

export type ProgressWithMove = UserProgress & { move: Move };
