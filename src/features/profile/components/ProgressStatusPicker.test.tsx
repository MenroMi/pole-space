import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgressStatusPicker from './ProgressStatusPicker';

describe('ProgressStatusPicker', () => {
  it('renders three status buttons', () => {
    render(
      <ProgressStatusPicker
        currentStatus="WANT_TO_LEARN"
        onStatusChange={vi.fn()}
        isPending={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'Want to Learn' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'In Progress' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Learned' })).toBeInTheDocument();
  });

  it('disables the currently active status button', () => {
    render(
      <ProgressStatusPicker
        currentStatus="IN_PROGRESS"
        onStatusChange={vi.fn()}
        isPending={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'In Progress' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Want to Learn' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Learned' })).not.toBeDisabled();
  });

  it('calls onStatusChange with correct value when an inactive button is clicked', async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn();
    render(
      <ProgressStatusPicker
        currentStatus="WANT_TO_LEARN"
        onStatusChange={onStatusChange}
        isPending={false}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Learned' }));
    expect(onStatusChange).toHaveBeenCalledWith('LEARNED');
  });

  it('sets aria-pressed=true only on the active status button', () => {
    render(
      <ProgressStatusPicker
        currentStatus="IN_PROGRESS"
        onStatusChange={vi.fn()}
        isPending={false}
      />,
    );
    expect(screen.getByRole('button', { name: 'In Progress' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Want to Learn' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: 'Learned' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('disables all buttons when isPending is true', () => {
    render(
      <ProgressStatusPicker
        currentStatus="WANT_TO_LEARN"
        onStatusChange={vi.fn()}
        isPending={true}
      />,
    );
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });
});
