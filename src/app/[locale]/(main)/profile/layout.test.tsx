import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { auth } from '@/shared/lib/auth';
import { getActiveSessionUser } from '@/shared/lib/session-user';

import ProfileLayout from './layout';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn(async () => 'pl') }));
vi.mock('@/shared/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/shared/lib/session-user', () => ({ getActiveSessionUser: vi.fn() }));
vi.mock('@/features/profile/components/ProfileAside', () => ({ default: () => null }));
vi.mock('@/features/profile/components/ProfileMobileNav', () => ({ default: () => null }));
vi.mock('@/shared/components/PageShell', () => ({ default: () => null }));
vi.mock('@/shared/components/SessionGuard', () => ({ SessionGuard: () => null }));

const mockAuth = vi.mocked(auth) as unknown as ReturnType<typeof vi.fn>;
const mockGetActiveSessionUser = vi.mocked(getActiveSessionUser);

describe('ProfileLayout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects to login without a session', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(ProfileLayout({ children: null })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/pl/login');
  });

  it('redirects to catalog when the JWT is valid but the user is blocked or deleted', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    mockGetActiveSessionUser.mockResolvedValue(null);
    await expect(ProfileLayout({ children: null })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/pl/catalog');
  });

  it('renders for an active user', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1' } });
    mockGetActiveSessionUser.mockResolvedValue({ id: 'u1', role: 'USER' });
    await expect(ProfileLayout({ children: null })).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
});
