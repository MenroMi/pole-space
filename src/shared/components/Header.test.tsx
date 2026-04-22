import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { auth } from '@/shared/lib/auth';

import Header from './Header';

vi.mock('@/shared/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('./HeaderNav', () => ({ default: () => <nav data-testid="header-nav" /> }));
vi.mock('./UserMenu', () => ({
  default: (props: { user: { name: string | null; image: string | null } | null }) => (
    <div data-testid="user-menu" data-user={JSON.stringify(props.user)} />
  ),
}));

const mockAuth = auth as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('Header', () => {
  it('renders wordmark linking to /', async () => {
    mockAuth.mockResolvedValue(null);
    render(await Header());
    expect(screen.getByRole('link', { name: /kinetic gallery/i })).toHaveAttribute('href', '/');
  });

  it('renders HeaderNav', async () => {
    mockAuth.mockResolvedValue(null);
    render(await Header());
    expect(screen.getByTestId('header-nav')).toBeInTheDocument();
  });

  it('passes user=null to UserMenu when no session', async () => {
    mockAuth.mockResolvedValue(null);
    render(await Header());
    const menu = screen.getByTestId('user-menu');
    expect(JSON.parse(menu.getAttribute('data-user')!)).toBeNull();
  });

  it('passes user object to UserMenu when session exists', async () => {
    mockAuth.mockResolvedValue({
      user: { id: '1', role: 'USER', name: 'Alice', image: 'https://example.com/avatar.jpg' },
    });
    render(await Header());
    const menu = screen.getByTestId('user-menu');
    expect(JSON.parse(menu.getAttribute('data-user')!)).toEqual({
      name: 'Alice',
      image: 'https://example.com/avatar.jpg',
    });
  });
});
