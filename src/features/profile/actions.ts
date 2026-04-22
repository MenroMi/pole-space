'use server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { auth } from '@/shared/lib/auth';
import { cloudinary } from '@/shared/lib/cloudinary';
import { prisma } from '@/shared/lib/prisma';
import type { LearnStatus } from '@/shared/types';

import type { FavouriteWithMove, ProgressWithMove } from './types';

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user.id;
}

const profileNameSchema = z.object({
  name: z.string().min(5, 'Name must be at least 5 characters').max(50, 'Name is too long'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export async function getUserProgressAction(status?: LearnStatus): Promise<ProgressWithMove[]> {
  const userId = await requireAuth();
  return prisma.userProgress.findMany({
    where: { userId, ...(status ? { status } : {}) },
    include: { move: true },
  });
}

export async function updateProgressAction(moveId: string, status: LearnStatus) {
  const userId = await requireAuth();
  return prisma.userProgress.upsert({
    where: { userId_moveId: { userId, moveId } },
    create: { userId, moveId, status },
    update: { status },
  });
}

export async function updateProfileAction(data: { name: string }) {
  const userId = await requireAuth();
  const parsed = profileNameSchema.safeParse(data);
  if (!parsed.success) return { success: false as const, error: 'Invalid input' };
  await prisma.user.update({ where: { id: userId }, data: { name: parsed.data.name } });
  return { success: true as const };
}

export async function uploadAvatarAction(formData: FormData) {
  const userId = await requireAuth();
  const file = formData.get('avatar') as File | null;
  if (!file) return { success: false as const, error: 'No file provided' };
  if (!file.type.startsWith('image/'))
    return { success: false as const, error: 'Only image files are allowed' };
  if (file.size > 5 * 1024 * 1024)
    return { success: false as const, error: 'File size must be under 5MB' };

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { folder: 'pole-dance-catalog/avatars', public_id: `user-${userId}`, overwrite: true },
        (error, res) => {
          if (error || !res) reject(error ?? new Error('Upload failed'));
          else resolve(res as { secure_url: string });
        },
      )
      .end(buffer);
  });

  await prisma.user.update({ where: { id: userId }, data: { image: result.secure_url } });
  return { success: true as const, imageUrl: result.secure_url };
}

export async function changePasswordAction(data: { currentPassword: string; newPassword: string }) {
  const userId = await requireAuth();
  const parsed = changePasswordSchema.safeParse(data);
  if (!parsed.success) return { success: false as const, error: 'Invalid input' };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  if (!user?.password)
    return { success: false as const, error: 'Password change is not available' };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!valid) return { success: false as const, error: 'Current password is incorrect' };

  const hashed = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  return { success: true as const };
}

export async function addFavouriteAction(moveId: string) {
  const userId = await requireAuth();
  await prisma.userFavourite.upsert({
    where: { userId_moveId: { userId, moveId } },
    create: { userId, moveId },
    update: {},
  });
  return { success: true as const };
}

export async function removeFavouriteAction(moveId: string) {
  const userId = await requireAuth();
  await prisma.userFavourite.deleteMany({
    where: { userId, moveId },
  });
  return { success: true as const };
}

export async function getUserFavouritesAction(): Promise<FavouriteWithMove[]> {
  const userId = await requireAuth();
  return prisma.userFavourite.findMany({
    where: { userId },
    include: { move: true },
    orderBy: { createdAt: 'desc' },
  });
}
