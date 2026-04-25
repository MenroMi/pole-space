import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MoveTabs from './MoveTabs';

describe('MoveTabs', () => {
  it('renders three tab buttons', () => {
    render(<MoveTabs steps={[]} />);
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Muscles' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Safety' })).toBeInTheDocument();
  });

  it('shows Breakdown tab content by default', () => {
    render(<MoveTabs steps={['Step one']} />);
    expect(screen.getByText('Step one')).toBeInTheDocument();
  });

  it('switches to Muscles coming soon on click', async () => {
    const user = userEvent.setup();
    render(<MoveTabs steps={[]} />);
    await user.click(screen.getByRole('tab', { name: 'Muscles' }));
    expect(screen.getAllByText('Coming soon')).toHaveLength(1);
  });

  it('switches to Safety coming soon on click', async () => {
    const user = userEvent.setup();
    render(<MoveTabs steps={[]} />);
    await user.click(screen.getByRole('tab', { name: 'Safety' }));
    expect(screen.getAllByText('Coming soon')).toHaveLength(1);
  });
});
