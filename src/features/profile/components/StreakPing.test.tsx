import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { recordStreakActivityAction } from '@/features/profile/actions';
import { usePathname } from '@/i18n/navigation';

import StreakPing from './StreakPing';

vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

vi.mock('@/i18n/navigation', () => ({
  usePathname: vi.fn(() => '/catalog'),
}));

vi.mock('@/features/profile/actions', () => ({
  recordStreakActivityAction: vi.fn(),
}));

import { useSession } from 'next-auth/react';

describe('StreakPing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
  });

  it('does not call action when unauthenticated', () => {
    vi.mocked(useSession).mockReturnValue({ status: 'unauthenticated' } as never);
    render(<StreakPing />);
    expect(recordStreakActivityAction).not.toHaveBeenCalled();
  });

  it('calls action on mount when authenticated', () => {
    vi.mocked(useSession).mockReturnValue({ status: 'authenticated' } as never);
    render(<StreakPing />);
    expect(recordStreakActivityAction).toHaveBeenCalledTimes(1);
    const [todayArg, tzArg] = vi.mocked(recordStreakActivityAction).mock.calls[0];
    expect(todayArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(typeof tzArg).toBe('string');
    expect(tzArg.length).toBeGreaterThan(0);
  });

  it('re-fires on pathname change', () => {
    vi.mocked(useSession).mockReturnValue({ status: 'authenticated' } as never);
    vi.mocked(usePathname).mockReturnValue('/catalog');
    const { rerender } = render(<StreakPing />);
    expect(recordStreakActivityAction).toHaveBeenCalledTimes(1);

    vi.mocked(usePathname).mockReturnValue('/profile');
    rerender(<StreakPing />);
    expect(recordStreakActivityAction).toHaveBeenCalledTimes(2);
  });

  it('calls action on visibilitychange → visible', () => {
    vi.mocked(useSession).mockReturnValue({ status: 'authenticated' } as never);
    render(<StreakPing />);
    expect(recordStreakActivityAction).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(recordStreakActivityAction).toHaveBeenCalledTimes(2);
  });

  it('does not call action on visibilitychange → hidden', () => {
    vi.mocked(useSession).mockReturnValue({ status: 'authenticated' } as never);
    render(<StreakPing />);
    expect(recordStreakActivityAction).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(recordStreakActivityAction).toHaveBeenCalledTimes(1);
  });

  it('removes visibilitychange listener on unmount', () => {
    vi.mocked(useSession).mockReturnValue({ status: 'authenticated' } as never);
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(<StreakPing />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
  });
});
