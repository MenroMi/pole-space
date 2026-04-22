import { render } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

import { SessionGuard } from './SessionGuard';

const mockReplace = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue({ replace: mockReplace } as ReturnType<typeof useRouter>);
});

describe('SessionGuard', () => {
  it('redirects to /login when session status is unauthenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      status: 'unauthenticated',
      data: null,
      update: vi.fn(),
    });

    render(
      <SessionGuard>
        <div>protected</div>
      </SessionGuard>,
    );

    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('does not redirect when session status is authenticated', () => {
    vi.mocked(useSession).mockReturnValue({
      status: 'authenticated',
      data: { user: { name: 'Alice' }, expires: '2099-01-01' },
      update: vi.fn(),
    });

    render(
      <SessionGuard>
        <div>protected</div>
      </SessionGuard>,
    );

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect while session is loading', () => {
    vi.mocked(useSession).mockReturnValue({
      status: 'loading',
      data: null,
      update: vi.fn(),
    });

    render(
      <SessionGuard>
        <div>protected</div>
      </SessionGuard>,
    );

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders children regardless of session status', () => {
    vi.mocked(useSession).mockReturnValue({
      status: 'authenticated',
      data: { user: {}, expires: '2099-01-01' },
      update: vi.fn(),
    });

    const { getByText } = render(
      <SessionGuard>
        <div>protected content</div>
      </SessionGuard>,
    );

    expect(getByText('protected content')).toBeInTheDocument();
  });
});
