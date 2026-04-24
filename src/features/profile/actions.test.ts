import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    userProgress: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    userFavourite: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/shared/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock('@/shared/lib/cloudinary', () => ({
  cloudinary: {
    uploader: {
      upload_stream: vi.fn(),
    },
  },
}));

import { auth } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';
import bcrypt from 'bcryptjs';
import { cloudinary } from '@/shared/lib/cloudinary';

import {
  getUserProgressAction,
  updateProgressAction,
  updateProfileAction,
  changePasswordAction,
  uploadAvatarAction,
  addFavouriteAction,
  removeFavouriteAction,
  getUserFavouritesAction,
  getProfileUserAction,
  getProfileStatsAction,
} from './actions';

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.userProgress.findMany as ReturnType<typeof vi.fn>;
const mockUpsert = prisma.userProgress.upsert as ReturnType<typeof vi.fn>;
const mockUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockUserUpdate = prisma.user.update as ReturnType<typeof vi.fn>;
const mockFavouriteUpsert = prisma.userFavourite.upsert as ReturnType<typeof vi.fn>;
const mockFavouriteDeleteMany = prisma.userFavourite.deleteMany as ReturnType<typeof vi.fn>;
const mockFavouriteFindMany = prisma.userFavourite.findMany as ReturnType<typeof vi.fn>;
const mockProgressCount = prisma.userProgress.count as ReturnType<typeof vi.fn>;
const mockFavouriteCount = prisma.userFavourite.count as ReturnType<typeof vi.fn>;
const mockBcryptCompare = bcrypt.compare as ReturnType<typeof vi.fn>;
const mockBcryptHash = bcrypt.hash as ReturnType<typeof vi.fn>;
const mockUploadStream = cloudinary.uploader.upload_stream as ReturnType<typeof vi.fn>;

const session = { user: { id: 'user-123' } };

beforeEach(() => vi.clearAllMocks());

describe('getUserProgressAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getUserProgressAction()).rejects.toThrow('Unauthorized');
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('returns progress for the authenticated user', async () => {
    mockAuth.mockResolvedValue(session);
    mockFindMany.mockResolvedValue([{ id: 'progress-1' }]);
    const result = await getUserProgressAction();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-123' } }),
    );
    expect(result).toEqual([{ id: 'progress-1' }]);
  });

  it('filters by status when status param is provided', async () => {
    mockAuth.mockResolvedValue(session);
    mockFindMany.mockResolvedValue([{ id: 'progress-2' }]);
    await getUserProgressAction('IN_PROGRESS');
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-123', status: 'IN_PROGRESS' } }),
    );
  });
});

describe('updateProgressAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(updateProgressAction('move-1', 'IN_PROGRESS')).rejects.toThrow('Unauthorized');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('upserts progress using session userId', async () => {
    mockAuth.mockResolvedValue(session);
    mockUpsert.mockResolvedValue({ id: 'progress-1' });
    const result = await updateProgressAction('move-1', 'IN_PROGRESS');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_moveId: { userId: 'user-123', moveId: 'move-1' } },
        create: expect.objectContaining({
          userId: 'user-123',
          moveId: 'move-1',
          status: 'IN_PROGRESS',
        }),
      }),
    );
    expect(result).toEqual({ id: 'progress-1' });
  });
});

describe('updateProfileAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(updateProfileAction({ name: 'Alice' })).rejects.toThrow('Unauthorized');
  });

  it('returns error for invalid name (too short)', async () => {
    mockAuth.mockResolvedValue(session);
    const result = await updateProfileAction({ name: 'A' });
    expect(result).toEqual({ success: false, error: 'Invalid input' });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('updates user name and returns success', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserUpdate.mockResolvedValue({ id: 'user-123', name: 'Alice' });
    const result = await updateProfileAction({ name: 'Alice' });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { name: 'Alice' },
    });
    expect(result).toEqual({ success: true });
  });

  it('updates name and location when location is provided', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserUpdate.mockResolvedValue({ id: 'user-123' });
    const result = await updateProfileAction({ name: 'Alice Pole', location: 'Warsaw, PL' });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { name: 'Alice Pole', location: 'Warsaw, PL' },
    });
    expect(result).toEqual({ success: true });
  });

  it('does not write location when empty string is provided', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserUpdate.mockResolvedValue({ id: 'user-123' });
    const result = await updateProfileAction({ name: 'Alice Pole', location: '' });
    expect(result).toEqual({ success: false, error: 'Invalid input' });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});

describe('uploadAvatarAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(uploadAvatarAction(new FormData())).rejects.toThrow('Unauthorized');
  });

  it('returns error when no file provided', async () => {
    mockAuth.mockResolvedValue(session);
    const result = await uploadAvatarAction(new FormData());
    expect(result).toEqual({ success: false, error: 'No file provided' });
  });

  it('returns error for non-image file type', async () => {
    mockAuth.mockResolvedValue(session);
    const formData = new FormData();
    formData.append('avatar', new File(['data'], 'doc.pdf', { type: 'application/pdf' }));
    const result = await uploadAvatarAction(formData);
    expect(result).toEqual({ success: false, error: 'Only image files are allowed' });
  });

  it('returns error when file exceeds 5MB', async () => {
    mockAuth.mockResolvedValue(session);
    const formData = new FormData();
    formData.append(
      'avatar',
      new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' }),
    );
    const result = await uploadAvatarAction(formData);
    expect(result).toEqual({ success: false, error: 'File size must be under 5MB' });
  });

  it('uploads file and updates user image', async () => {
    mockAuth.mockResolvedValue(session);
    mockUploadStream.mockImplementation(
      (_opts: unknown, cb: (err: null, res: { secure_url: string }) => void) => {
        cb(null, { secure_url: 'https://res.cloudinary.com/test/image/upload/user-user-123' });
        return { end: vi.fn() };
      },
    );
    mockUserUpdate.mockResolvedValue({ id: 'user-123' });
    const formData = new FormData();
    formData.append('avatar', new File(['data'], 'photo.jpg', { type: 'image/jpeg' }));
    const result = await uploadAvatarAction(formData);
    expect(result).toEqual({
      success: true,
      imageUrl: 'https://res.cloudinary.com/test/image/upload/user-user-123',
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { image: 'https://res.cloudinary.com/test/image/upload/user-user-123' },
    });
  });
});

describe('changePasswordAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(
      changePasswordAction({ currentPassword: 'old', newPassword: 'newpassword123' }),
    ).rejects.toThrow('Unauthorized');
  });

  it('returns error when user has no password (OAuth account)', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserFindUnique.mockResolvedValue({ password: null });
    const result = await changePasswordAction({
      currentPassword: 'old',
      newPassword: 'newpassword123',
    });
    expect(result).toEqual({ success: false, error: 'Password change is not available' });
    expect(mockBcryptCompare).not.toHaveBeenCalled();
  });

  it('returns error when current password is incorrect', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserFindUnique.mockResolvedValue({ password: 'hashed' });
    mockBcryptCompare.mockResolvedValue(false);
    const result = await changePasswordAction({
      currentPassword: 'wrong',
      newPassword: 'newpassword123',
    });
    expect(result).toEqual({ success: false, error: 'Current password is incorrect' });
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('updates password and returns success when current password is correct', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserFindUnique.mockResolvedValue({ password: 'hashed' });
    mockBcryptCompare.mockResolvedValue(true);
    mockBcryptHash.mockResolvedValue('newhashed');
    mockUserUpdate.mockResolvedValue({ id: 'user-123' });
    const result = await changePasswordAction({
      currentPassword: 'correct',
      newPassword: 'newpassword123',
    });
    expect(mockBcryptHash).toHaveBeenCalledWith('newpassword123', 10);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { password: 'newhashed' },
    });
    expect(result).toEqual({ success: true });
  });
});

describe('addFavouriteAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(addFavouriteAction('move-1')).rejects.toThrow('Unauthorized');
  });

  it('upserts favourite and returns success (idempotent)', async () => {
    mockAuth.mockResolvedValue(session);
    mockFavouriteUpsert.mockResolvedValue({ id: 'fav-1' });
    const result = await addFavouriteAction('move-1');
    expect(mockFavouriteUpsert).toHaveBeenCalledWith({
      where: { userId_moveId: { userId: 'user-123', moveId: 'move-1' } },
      create: { userId: 'user-123', moveId: 'move-1' },
      update: {},
    });
    expect(result).toEqual({ success: true });
  });
});

describe('removeFavouriteAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(removeFavouriteAction('move-1')).rejects.toThrow('Unauthorized');
  });

  it('deletes favourite and returns success', async () => {
    mockAuth.mockResolvedValue(session);
    mockFavouriteDeleteMany.mockResolvedValue({ count: 1 });
    const result = await removeFavouriteAction('move-1');
    expect(mockFavouriteDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-123', moveId: 'move-1' },
    });
    expect(result).toEqual({ success: true });
  });
});

describe('getUserFavouritesAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getUserFavouritesAction()).rejects.toThrow('Unauthorized');
  });

  it('returns favourites with move for the authenticated user', async () => {
    mockAuth.mockResolvedValue(session);
    mockFavouriteFindMany.mockResolvedValue([{ id: 'fav-1', move: { title: 'Spin' } }]);
    const result = await getUserFavouritesAction();
    expect(mockFavouriteFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-123' },
        include: { move: true },
      }),
    );
    expect(result).toEqual([{ id: 'fav-1', move: { title: 'Spin' } }]);
  });
});

describe('getProfileStatsAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getProfileStatsAction()).rejects.toThrow('Unauthorized');
    expect(mockProgressCount).not.toHaveBeenCalled();
    expect(mockFavouriteCount).not.toHaveBeenCalled();
  });

  it('returns mastered count and favourites count', async () => {
    mockAuth.mockResolvedValue(session);
    mockProgressCount.mockResolvedValue(7);
    mockFavouriteCount.mockResolvedValue(3);
    const result = await getProfileStatsAction();
    expect(mockProgressCount).toHaveBeenCalledWith({
      where: { userId: 'user-123', status: 'LEARNED' },
    });
    expect(mockFavouriteCount).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
    });
    expect(result).toEqual({ masteredCount: 7, favouritesCount: 3 });
  });
});

describe('getProfileUserAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(getProfileUserAction()).rejects.toThrow('Unauthorized');
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('returns user profile fields', async () => {
    mockAuth.mockResolvedValue(session);
    const mockUser = {
      name: 'Alice Pole',
      image: 'https://cdn.example.com/avatar.jpg',
      location: 'Warsaw, PL',
      createdAt: new Date('2023-01-15'),
    };
    mockUserFindUnique.mockResolvedValue(mockUser);
    const result = await getProfileUserAction();
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      select: { name: true, image: true, location: true, createdAt: true },
    });
    expect(result).toEqual(mockUser);
  });

  it('returns null when user not found', async () => {
    mockAuth.mockResolvedValue(session);
    mockUserFindUnique.mockResolvedValue(null);
    const result = await getProfileUserAction();
    expect(result).toBeNull();
  });
});
