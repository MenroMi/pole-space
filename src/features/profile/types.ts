import type { UserProgress, UserFavourite, Move } from '@prisma/client';

export type ProgressWithMove = UserProgress & { move: Move };
export type FavouriteWithMove = UserFavourite & { move: Move };

export interface ProfileFormValues {
  name: string;
}

export interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
