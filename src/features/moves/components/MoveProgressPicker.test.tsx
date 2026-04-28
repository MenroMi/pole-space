import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/profile/actions', () => ({
  updateProgressAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/profile/components/ProgressStatusPicker', () => ({
  default: vi.fn(
    ({
      currentStatus,
      onStatusChange,
      isPending,
    }: {
      currentStatus: string;
      onStatusChange: (s: string) => void;
      isPending: boolean;
    }) => (
      <div>
        <span data-testid="status">{currentStatus}</span>
        <span data-testid="pending">{String(isPending)}</span>
        <button onClick={() => onStatusChange('LEARNED')}>set learned</button>
      </div>
    ),
  ),
}));

import { updateProgressAction } from '@/features/profile/actions';
import { MoveProgressPicker } from './MoveProgressPicker';

beforeEach(() => vi.clearAllMocks());

describe('MoveProgressPicker', () => {
  it('renders with WANT_TO_LEARN when initialStatus is null', () => {
    render(<MoveProgressPicker moveId="m1" initialStatus={null} />);
    expect(screen.getByTestId('status').textContent).toBe('WANT_TO_LEARN');
  });

  it('renders with provided initialStatus', () => {
    render(<MoveProgressPicker moveId="m1" initialStatus="IN_PROGRESS" />);
    expect(screen.getByTestId('status').textContent).toBe('IN_PROGRESS');
  });

  it('calls updateProgressAction when status changes', async () => {
    const user = userEvent.setup();
    render(<MoveProgressPicker moveId="m1" initialStatus={null} />);
    await user.click(screen.getByRole('button', { name: 'set learned' }));
    expect(updateProgressAction).toHaveBeenCalledWith('m1', 'LEARNED');
  });

  it('updates displayed status optimistically on change', async () => {
    const user = userEvent.setup();
    render(<MoveProgressPicker moveId="m1" initialStatus={null} />);
    await user.click(screen.getByRole('button', { name: 'set learned' }));
    expect(screen.getByTestId('status').textContent).toBe('LEARNED');
  });
});
