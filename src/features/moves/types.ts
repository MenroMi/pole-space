import type { Move, UserFavourite } from '@prisma/client';

export type StepItem = { text: string; timestamp?: number };

export type MoveDetail = Omit<Move, 'stepsData'> & {
  favourites: UserFavourite[];
  stepsData: StepItem[];
};
