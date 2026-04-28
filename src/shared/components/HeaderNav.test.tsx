import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import HeaderNav from './HeaderNav';

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

describe('HeaderNav', () => {
  it('renders Catalog link with correct href', () => {
    vi.mocked(usePathname).mockReturnValue('/');
    render(<HeaderNav />);
    expect(screen.getByRole('link', { name: 'Catalog' })).toHaveAttribute('href', '/catalog');
  });

  it('applies active class to Catalog when on /catalog', () => {
    vi.mocked(usePathname).mockReturnValue('/catalog');
    render(<HeaderNav />);
    expect(screen.getByRole('link', { name: 'Catalog' }).className).toContain('text-primary');
  });

  it('applies active class to Catalog when pathname starts with /catalog/', () => {
    vi.mocked(usePathname).mockReturnValue('/catalog/some-page');
    render(<HeaderNav />);
    expect(screen.getByRole('link', { name: 'Catalog' }).className).toContain('text-primary');
  });

  it('does not apply active class to Catalog when on a different path', () => {
    vi.mocked(usePathname).mockReturnValue('/profile');
    render(<HeaderNav />);
    expect(screen.getByRole('link', { name: 'Catalog' }).className).not.toContain('text-primary');
  });
});
