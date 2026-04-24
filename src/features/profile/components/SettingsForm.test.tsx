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

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn(), push: mockPush })),
}));

import { profileSchema, changePasswordSchema } from './SettingsForm';

describe('profileSchema', () => {
  it('rejects empty firstName', () => {
    const result = profileSchema.safeParse({ firstName: '', lastName: 'Pole' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('First name is required');
  });

  it('rejects empty lastName', () => {
    const result = profileSchema.safeParse({ firstName: 'Alice', lastName: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Last name is required');
  });

  it('rejects missing firstName and lastName', () => {
    const result = profileSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts valid firstName and lastName', () => {
    const result = profileSchema.safeParse({ firstName: 'Alice', lastName: 'Pole' });
    expect(result.success).toBe(true);
  });

  it('rejects firstName longer than 50 characters', () => {
    const result = profileSchema.safeParse({ firstName: 'A'.repeat(51), lastName: 'Pole' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('First name is too long');
  });

  it('accepts valid username with lowercase, numbers, underscores', () => {
    const result = profileSchema.safeParse({ firstName: 'Alice', lastName: 'Pole', username: 'alice_pole_42' });
    expect(result.success).toBe(true);
  });

  it('rejects username shorter than 2 characters', () => {
    const result = profileSchema.safeParse({ firstName: 'Alice', lastName: 'Pole', username: 'a' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Username must be at least 2 characters');
  });

  it('rejects username with uppercase letters', () => {
    const result = profileSchema.safeParse({ firstName: 'Alice', lastName: 'Pole', username: 'Alice' });
    expect(result.success).toBe(false);
  });

  it('rejects username with spaces', () => {
    const result = profileSchema.safeParse({ firstName: 'Alice', lastName: 'Pole', username: 'alice pole' });
    expect(result.success).toBe(false);
  });

  it('accepts empty string username (treated as absent by submit handler)', () => {
    const result = profileSchema.safeParse({ firstName: 'Alice', lastName: 'Pole', username: '' });
    expect(result.success).toBe(true);
  });

  it('accepts valid location', () => {
    const result = profileSchema.safeParse({ firstName: 'Alice', lastName: 'Pole', location: 'Warsaw, PL' });
    expect(result.success).toBe(true);
  });

  it('rejects location longer than 100 characters', () => {
    const result = profileSchema.safeParse({ firstName: 'Alice', lastName: 'Pole', location: 'A'.repeat(101) });
    expect(result.success).toBe(false);
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
