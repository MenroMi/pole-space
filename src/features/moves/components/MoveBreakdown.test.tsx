import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { StepItem } from '../types';

import MoveBreakdown from './MoveBreakdown';

const noop = () => {};

describe('MoveBreakdown', () => {
  it('renders nothing when stepsData is empty', () => {
    const { container } = render(<MoveBreakdown stepsData={[]} onSeek={noop} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the correct number of steps', () => {
    const stepsData: StepItem[] = [
      { text: 'Grip the pole' },
      { text: 'Kick out' },
      { text: 'Extend' },
    ];
    render(<MoveBreakdown stepsData={stepsData} onSeek={noop} />);
    expect(screen.getByText('Grip the pole')).toBeInTheDocument();
    expect(screen.getByText('Kick out')).toBeInTheDocument();
    expect(screen.getByText('Extend')).toBeInTheDocument();
  });

  it('renders step numbers padded to two digits', () => {
    render(<MoveBreakdown stepsData={[{ text: 'First step' }]} onSeek={noop} />);
    expect(screen.getByText('01')).toBeInTheDocument();
  });

  it('renders timestamp badge for steps with a timestamp', () => {
    const stepsData: StepItem[] = [{ text: 'Kick out', timestamp: 45 }];
    render(<MoveBreakdown stepsData={stepsData} onSeek={noop} />);
    expect(screen.getByRole('button', { name: 'Seek to 0:45' })).toBeInTheDocument();
    expect(screen.getByText('0:45')).toBeInTheDocument();
  });

  it('does not render timestamp badge for steps without a timestamp', () => {
    const stepsData: StepItem[] = [{ text: 'Grip the pole' }];
    render(<MoveBreakdown stepsData={stepsData} onSeek={noop} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('formats timestamp correctly for minutes and seconds', () => {
    const stepsData: StepItem[] = [{ text: 'Step', timestamp: 90 }];
    render(<MoveBreakdown stepsData={stepsData} onSeek={noop} />);
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });

  it('calls onSeek with the correct seconds when badge is clicked', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    const stepsData: StepItem[] = [{ text: 'Kick out', timestamp: 45 }];
    render(<MoveBreakdown stepsData={stepsData} onSeek={onSeek} />);
    await user.click(screen.getByRole('button', { name: 'Seek to 0:45' }));
    expect(onSeek).toHaveBeenCalledWith(45);
    expect(onSeek).toHaveBeenCalledTimes(1);
  });

  it('does not call onSeek when clicking a step without a timestamp', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    const stepsData: StepItem[] = [{ text: 'Grip the pole' }];
    render(<MoveBreakdown stepsData={stepsData} onSeek={onSeek} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(onSeek).not.toHaveBeenCalled();
  });
});
