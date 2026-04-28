import { render, screen } from '@testing-library/react';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HomePage from './page';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/shared/lib/auth', () => ({ auth: vi.fn() }));

import { auth } from '@/shared/lib/auth';

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /catalog when session exists', async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: '1' } } as never);
    await HomePage();
    expect(redirect).toHaveBeenCalledWith('/catalog');
  });

  it('renders landing content when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    render(await HomePage());
    expect(screen.getByText(/quiet place/i)).toBeInTheDocument();
  });

  it('shows "Create an account" link pointing to /sign-up', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    render(await HomePage());
    const link = screen.getByRole('link', { name: /create an account/i });
    expect(link).toHaveAttribute('href', '/sign-up');
  });

  it('shows "Browse the catalog" link pointing to /catalog', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    render(await HomePage());
    const link = screen.getByRole('link', { name: /browse the catalog/i });
    expect(link).toHaveAttribute('href', '/catalog');
  });

  it('shows "Free. No invite needed." hint', async () => {
    vi.mocked(auth).mockResolvedValue(null);
    render(await HomePage());
    expect(screen.getByText(/free\. no invite needed\./i)).toBeInTheDocument();
  });
});
