import type { Move } from '@prisma/client';

export interface CreateMoveInput {
  title: string;
  description?: string;
  difficulty: Move['difficulty'];
  category: Move['category'];
  youtubeUrl: string;
  imageUrl?: string;
  tags?: string[];
}
