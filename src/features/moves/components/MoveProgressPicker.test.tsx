import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/features/profile/actions', () => ({
  updateProgressAction: vi.fn().mockResolvedValue(undefined),
  removeProgressAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/features/profile/components/ProgressStatusPicker', () => ({
  default: vi.fn(
    ({
      currentStatus,
      onStatusChange,
      isPending,
    }: {
      currentStatus: string | null;
      onStatusChange: (s: string | null) => void;
      isPending: boolean;
    }) => (
      <div>
        <span data-testid="status">{currentStatus}</span>
        <span data-testid="pending">{String(isPending)}</span>
        <button onClick={() => onStatusChange('LEARNED')}>set learned</button>
        <button onClick={() => onStatusChange(null)}>clear status</button>
      </div>
    ),
  ),
}));

import { updateProgressAction, removeProgressAction } from '@/features/profile/actions';
import { MoveProgressPicker } from './MoveProgressPicker';

beforeEach(() => vi.clearAllMocks());

describe('MoveProgressPicker', () => {
  it('renders with null status when initialStatus is null', () => {
    render(<MoveProgressPicker moveId="m1" initialStatus={null} />);
    expect(screen.getByTestId('status').textContent).toBe('');
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

  it('rolls back status if updateProgressAction throws', async () => {
    vi.mocked(updateProgressAction).mockRejectedValueOnce(new Error('Unauthorized'));
    const user = userEvent.setup();
    render(<MoveProgressPicker moveId="m1" initialStatus={null} />);
    await user.click(screen.getByRole('button', { name: 'set learned' }));
    expect(screen.getByTestId('status').textContent).toBe('');
  });

  it('calls removeProgressAction when status is set to null', async () => {
    const user = userEvent.setup();
    render(<MoveProgressPicker moveId="m1" initialStatus="IN_PROGRESS" />);
    await user.click(screen.getByRole('button', { name: 'clear status' }));
    expect(removeProgressAction).toHaveBeenCalledWith('m1');
  });

  it('rolls back status if removeProgressAction throws', async () => {
    vi.mocked(removeProgressAction).mockRejectedValueOnce(new Error('Unauthorized'));
    const user = userEvent.setup();
    render(<MoveProgressPicker moveId="m1" initialStatus="IN_PROGRESS" />);
    await user.click(screen.getByRole('button', { name: 'clear status' }));
    expect(screen.getByTestId('status').textContent).toBe('IN_PROGRESS');
  });
});
