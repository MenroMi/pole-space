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

const profileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  username: z
    .string()
    .min(2, 'Username must be at least 2 characters')
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores')
    .optional(),
  location: z.string().min(1).max(100).optional(),
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

export async function updateProfileAction(data: {
  firstName?: string;
  lastName?: string;
  username?: string;
  location?: string;
}) {
  const userId = await requireAuth();
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) return { success: false as const, error: 'Invalid input' };

  const updateData: {
    firstName?: string;
    lastName?: string;
    username?: string;
    location?: string;
  } = {};
  if (parsed.data.firstName !== undefined) updateData.firstName = parsed.data.firstName;
  if (parsed.data.lastName !== undefined) updateData.lastName = parsed.data.lastName;
  if (parsed.data.username !== undefined) updateData.username = parsed.data.username;
  if (parsed.data.location !== undefined) updateData.location = parsed.data.location;

  try {
    await prisma.user.update({ where: { id: userId }, data: updateData });
    return { success: true as const };
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return { success: false as const, field: 'username', error: 'Username already taken' };
    }
    throw error;
  }
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

export async function getProfileUserAction() {
  const userId = await requireAuth();
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      username: true,
      image: true,
      location: true,
      createdAt: true,
    },
  });
}

export async function getProfileStatsAction() {
  const userId = await requireAuth();
  const [masteredCount, favouritesCount] = await Promise.all([
    prisma.userProgress.count({ where: { userId, status: 'LEARNED' } }),
    prisma.userFavourite.count({ where: { userId } }),
  ]);
  return { masteredCount, favouritesCount };
}
