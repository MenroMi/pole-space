import type { Move, Tag, UserFavourite } from '@prisma/client';

export type StepItem = { text: string; timestamp?: number };

export type MoveDetail = Omit<Move, 'stepsData'> & {
  tags: Tag[];
  favourites: UserFavourite[];
  stepsData: StepItem[];
};
