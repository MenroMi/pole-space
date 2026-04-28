import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('./MoveBreakdown', () => ({
  default: vi.fn(
    ({ stepsData, onSeek }: { stepsData: { text: string }[]; onSeek: (s: number) => void }) => (
      <>
        {stepsData.map((s, i) => (
          <span key={i}>{s.text}</span>
        ))}
        <button type="button" onClick={() => onSeek(30)}>
          trigger seek
        </button>
      </>
    ),
  ),
}));

import MoveTabs from './MoveTabs';

const noop = () => {};

describe('MoveTabs', () => {
  it('renders three tab buttons', () => {
    render(<MoveTabs stepsData={[]} onSeek={noop} coachNote={null} coachNoteAuthor={null} />);
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Muscles' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Safety' })).toBeInTheDocument();
  });

  it('shows Breakdown tab content by default', () => {
    render(
      <MoveTabs
        stepsData={[{ text: 'Step one' }]}
        onSeek={noop}
        coachNote={null}
        coachNoteAuthor={null}
      />,
    );
    expect(screen.getByText('Step one')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Muscles' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Safety' })).toHaveAttribute('aria-selected', 'false');
  });

  it('switches to Muscles coming soon on click', async () => {
    const user = userEvent.setup();
    render(<MoveTabs stepsData={[]} onSeek={noop} coachNote={null} coachNoteAuthor={null} />);
    await user.click(screen.getByRole('tab', { name: 'Muscles' }));
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Muscles' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('switches to Safety coming soon on click', async () => {
    const user = userEvent.setup();
    render(<MoveTabs stepsData={[]} onSeek={noop} coachNote={null} coachNoteAuthor={null} />);
    await user.click(screen.getByRole('tab', { name: 'Safety' }));
    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Safety' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Breakdown' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('renders the tabpanel even when stepsData is empty', () => {
    render(<MoveTabs stepsData={[]} onSeek={noop} coachNote={null} coachNoteAuthor={null} />);
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('forwards onSeek to MoveBreakdown', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    render(
      <MoveTabs
        stepsData={[{ text: 'step' }]}
        onSeek={onSeek}
        coachNote={null}
        coachNoteAuthor={null}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'trigger seek' }));
    expect(onSeek).toHaveBeenCalledWith(30);
  });

  it('navigates to next tab with ArrowRight', async () => {
    const user = userEvent.setup();
    render(<MoveTabs stepsData={[]} onSeek={noop} coachNote={null} coachNoteAuthor={null} />);
    screen.getByRole('tab', { name: 'Breakdown' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Muscles' })).toHaveAttribute('aria-selected', 'true');
  });

  it('wraps around to last tab with ArrowLeft from first', async () => {
    const user = userEvent.setup();
    render(<MoveTabs stepsData={[]} onSeek={noop} coachNote={null} coachNoteAuthor={null} />);
    screen.getByRole('tab', { name: 'Breakdown' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Safety' })).toHaveAttribute('aria-selected', 'true');
  });
});
