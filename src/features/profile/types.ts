import type { UserProgress, UserFavourite, Move, Tag } from '@prisma/client';

export type ProgressWithMove = UserProgress & { move: Move };
export type FavouriteWithMove = UserFavourite & { move: Move & { tags: Tag[] } };

export interface ProfileFormValues {
  name: string;
}

export interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
