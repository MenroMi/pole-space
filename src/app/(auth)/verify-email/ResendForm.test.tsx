import { render, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));
vi.mock('@/features/auth/actions', () => ({
  checkEmailVerifiedAction: vi.fn(),
}));
vi.mock('@/features/auth', () => ({
  RESEND_COOLDOWN_S: 60,
}));

import { checkEmailVerifiedAction } from '@/features/auth/actions';

import { ResendForm } from './ResendForm';

const mockReplace = vi.fn();
const mockCheckVerified = checkEmailVerifiedAction as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue({ replace: mockReplace } as ReturnType<typeof useRouter>);
});

describe('ResendForm — visibilitychange', () => {
  it('calls router.replace(/login) when tab gains focus and email is verified', async () => {
    mockCheckVerified.mockResolvedValue(true);

    render(<ResendForm action={vi.fn()} email="alice@example.com" />);

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => {
      expect(mockCheckVerified).toHaveBeenCalledWith('alice@example.com');
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('does not redirect when tab gains focus but email is not yet verified', async () => {
    mockCheckVerified.mockResolvedValue(false);

    render(<ResendForm action={vi.fn()} email="alice@example.com" />);

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => {
      expect(mockCheckVerified).toHaveBeenCalledWith('alice@example.com');
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not call checkEmailVerifiedAction when visibility is hidden', async () => {
    mockCheckVerified.mockResolvedValue(false);

    render(<ResendForm action={vi.fn()} email="alice@example.com" />);

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    await new Promise((r) => setTimeout(r, 50));
    expect(mockCheckVerified).not.toHaveBeenCalled();
  });
});
