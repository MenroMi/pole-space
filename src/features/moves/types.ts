import type { Move, UserFavourite } from '@prisma/client';
import type { LearnStatus } from '@/shared/types';

export type StepItem = { text: string; timestamp?: number };

export type MoveDetail = Omit<Move, 'stepsData'> & {
  favourites: UserFavourite[];
  stepsData: StepItem[];
  currentProgress: LearnStatus | null;
};
