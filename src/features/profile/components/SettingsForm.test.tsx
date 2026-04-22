import { describe, it, expect, vi } from 'vitest';

vi.mock('next-auth', () => ({ default: vi.fn(), getServerSession: vi.fn() }));
vi.mock('@/shared/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/shared/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/shared/lib/cloudinary', () => ({
  cloudinary: { uploader: { upload_stream: vi.fn() } },
}));
vi.mock('../actions', () => ({
  updateProfileAction: vi.fn(),
  changePasswordAction: vi.fn(),
  uploadAvatarAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: vi.fn(() => ({ refresh: vi.fn() })) }));

import { profileNameSchema, changePasswordSchema } from './SettingsForm';

describe('profileNameSchema', () => {
  it('rejects empty name', () => {
    const result = profileNameSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name shorter than 2 characters', () => {
    const result = profileNameSchema.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Name must be at least 2 characters');
  });

  it('rejects name longer than 50 characters', () => {
    const result = profileNameSchema.safeParse({ name: 'A'.repeat(51) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Name is too long');
  });

  it('accepts a valid name', () => {
    const result = profileNameSchema.safeParse({ name: 'Alice' });
    expect(result.success).toBe(true);
  });
});

describe('changePasswordSchema', () => {
  it('rejects password shorter than 8 characters', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'current',
      newPassword: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects when newPassword and confirmPassword do not match', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'current123',
      newPassword: 'newpassword123',
      confirmPassword: 'different123',
    });
    expect(result.success).toBe(false);
    const confirmError = result.error?.issues.find((i) => i.path.includes('confirmPassword'));
    expect(confirmError?.message).toBe('Passwords do not match');
  });

  it('accepts valid matching passwords', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'current123',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    });
    expect(result.success).toBe(true);
  });
});
