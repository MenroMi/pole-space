import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoveTabs from './MoveTabs';

const noop = () => {};

describe('MoveTabs', () => {
  it('renders three tab buttons', () => {
    render(<MoveTabs stepsData={[]} onSeek={noop} />);
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Muscles' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Safety' })).toBeInTheDocument();
  });

  it('shows Breakdown tab content by default', () => {
    render(<MoveTabs stepsData={[{ text: 'Step one' }]} onSeek={noop} />);
    expect(screen.getByText('Step one')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Muscles' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Safety' })).toHaveAttribute('aria-selected', 'false');
  });

  it('switches to Muscles coming soon on click', async () => {
    const user = userEvent.setup();
    render(<MoveTabs stepsData={[]} onSeek={noop} />);
    await user.click(screen.getByRole('tab', { name: 'Muscles' }));
    expect(screen.getAllByText('Coming soon')).toHaveLength(1);
    expect(screen.getByRole('tab', { name: 'Muscles' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('switches to Safety coming soon on click', async () => {
    const user = userEvent.setup();
    render(<MoveTabs stepsData={[]} onSeek={noop} />);
    await user.click(screen.getByRole('tab', { name: 'Safety' }));
    expect(screen.getAllByText('Coming soon')).toHaveLength(1);
    expect(screen.getByRole('tab', { name: 'Safety' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('renders the tabpanel even when stepsData is empty', () => {
    render(<MoveTabs stepsData={[]} onSeek={noop} />);
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });
});
