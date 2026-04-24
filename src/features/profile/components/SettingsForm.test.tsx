import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
vi.mock('./AvatarUpload', () => ({ default: () => null }));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ refresh: vi.fn(), push: mockPush })),
}));

import SettingsForm, { profileSchema, changePasswordSchema } from './SettingsForm';
import { updateProfileAction, changePasswordAction } from '../actions';

const mockUpdateProfile = updateProfileAction as ReturnType<typeof vi.fn>;
const mockChangePassword = changePasswordAction as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('profileSchema', () => {
  it('accepts empty firstName (treated as absent)', () => {
    const result = profileSchema.safeParse({ firstName: '', lastName: 'Pole' });
    expect(result.success).toBe(true);
  });

  it('accepts empty lastName (treated as absent)', () => {
    const result = profileSchema.safeParse({ firstName: 'Alice', lastName: '' });
    expect(result.success).toBe(true);
  });

  it('accepts missing firstName and lastName', () => {
    const result = profileSchema.safeParse({});
    expect(result.success).toBe(true);
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

  it('rejects lastName longer than 50 characters', () => {
    const result = profileSchema.safeParse({ firstName: 'Alice', lastName: 'A'.repeat(51) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Last name is too long');
  });

  it('accepts valid location', () => {
    const result = profileSchema.safeParse({
      firstName: 'Alice',
      lastName: 'Pole',
      location: 'Warsaw, PL',
    });
    expect(result.success).toBe(true);
  });

  it('rejects location longer than 100 characters', () => {
    const result = profileSchema.safeParse({
      firstName: 'Alice',
      lastName: 'Pole',
      location: 'A'.repeat(101),
    });
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

describe('SettingsForm behavior', () => {
  const defaultProps = {
    firstName: 'Alice' as string | null,
    lastName: 'Pole' as string | null,
    image: null as string | null,
    location: null as string | null,
    email: 'alice@example.com',
    hasPassword: false,
  };

  it('discard navigates to /profile', async () => {
    const user = userEvent.setup();
    render(<SettingsForm {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /discard/i }));
    expect(mockPush).toHaveBeenCalledWith('/profile');
  });

  it('save calls updateProfileAction with form values and navigates on success', async () => {
    mockUpdateProfile.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<SettingsForm {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/profile'));
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      firstName: 'Alice',
      lastName: 'Pole',
      location: undefined,
    });
  });

  it('skips changePasswordAction when password fields are empty', async () => {
    mockUpdateProfile.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<SettingsForm {...defaultProps} hasPassword={true} />);
    await user.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/profile'));
    expect(mockChangePassword).not.toHaveBeenCalled();
  });
});
