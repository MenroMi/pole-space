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

import { profileSchema, changePasswordSchema } from './SettingsForm';

describe('profileSchema', () => {
  it('rejects empty name', () => {
    const result = profileSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name shorter than 5 characters', () => {
    const result = profileSchema.safeParse({ name: 'Ali' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Name must be at least 5 characters');
  });

  it('rejects name longer than 50 characters', () => {
    const result = profileSchema.safeParse({ name: 'A'.repeat(51) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Name is too long');
  });

  it('accepts valid name with no location', () => {
    const result = profileSchema.safeParse({ name: 'Alice' });
    expect(result.success).toBe(true);
  });

  it('accepts valid name with location', () => {
    const result = profileSchema.safeParse({ name: 'Alice', location: 'Warsaw, PL' });
    expect(result.success).toBe(true);
    expect(result.data?.location).toBe('Warsaw, PL');
  });

  it('rejects location longer than 100 characters', () => {
    const result = profileSchema.safeParse({ name: 'Alice', location: 'A'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('accepts empty string as location (treated as absent by the form handler)', () => {
    const result = profileSchema.safeParse({ name: 'Alice', location: '' });
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
