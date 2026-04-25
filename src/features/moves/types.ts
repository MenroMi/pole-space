import type { Move, Tag, UserFavourite } from '@prisma/client';

export type MoveDetail = Move & { tags: Tag[]; favourites: UserFavourite[] };
