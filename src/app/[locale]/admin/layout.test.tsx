import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redirect } from '@/i18n/navigation';
import { getActiveSessionUser } from '@/shared/lib/session-user';

import AdminLayout from './layout';

vi.mock('@/i18n/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn(async () => 'pl') }));
vi.mock('@/shared/lib/session-user', () => ({ getActiveSessionUser: vi.fn() }));

const mockGetActiveSessionUser = vi.mocked(getActiveSessionUser);

describe('AdminLayout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects home when there is no active user (no session, deleted or blocked)', async () => {
    mockGetActiveSessionUser.mockResolvedValue(null);
    await expect(AdminLayout({ children: 'admin' })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({ href: '/', locale: 'pl' });
  });

  it('redirects home when the DB role is not ADMIN (demoted after sign-in)', async () => {
    mockGetActiveSessionUser.mockResolvedValue({ id: 'u1', role: 'USER' });
    await expect(AdminLayout({ children: 'admin' })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({ href: '/', locale: 'pl' });
  });

  it('renders children for an active admin', async () => {
    mockGetActiveSessionUser.mockResolvedValue({ id: 'a1', role: 'ADMIN' });
    const result = await AdminLayout({ children: 'admin' });
    expect(redirect).not.toHaveBeenCalled();
    expect(result.props.children).toBe('admin');
  });
});
