import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const scrollToMock = vi.fn();
vi.stubGlobal('scrollTo', scrollToMock);

vi.mock('./MoveHero', () => ({
  default: vi.fn(({ seekRequest }: { seekRequest?: { seconds: number } }) => (
    <div data-testid="move-hero" data-seek-to={seekRequest?.seconds ?? ''} />
  )),
}));

vi.mock('./MoveTabs', () => ({
  default: vi.fn(({ onSeek }: { onSeek: (s: number) => void }) => (
    <button type="button" onClick={() => onSeek(45)}>
      seek
    </button>
  )),
}));

vi.mock('./MoveFavouriteButton', () => ({
  default: vi.fn(() => <button type="button">favourite</button>),
}));

vi.mock('./MoveProgressPicker', () => ({
  MoveProgressPicker: vi.fn(() => <div data-testid="progress-picker" />),
}));

import type { StepItem } from '../types';
import MovePlayer from './MovePlayer';

const baseProps = {
  title: 'Fireman Spin',
  youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
  imageUrl: null,
  stepsData: [] as StepItem[],
  difficulty: 'BEGINNER' as const,
  description: 'A graceful spinning move.',
  category: 'SPINS' as const,
  poleType: null,
  moveId: 'move-1',
  isFavourited: false,
  isAuthenticated: true,
  currentProgress: null,
};

describe('MovePlayer', () => {
  beforeEach(() => scrollToMock.mockClear());

  it('renders MoveHero', () => {
    render(<MovePlayer {...baseProps} />);
    expect(screen.getByTestId('move-hero')).toBeInTheDocument();
  });

  it('renders MoveTabs', () => {
    render(<MovePlayer {...baseProps} />);
    expect(screen.getByRole('button', { name: 'seek' })).toBeInTheDocument();
  });

  it('renders the move title as h1', () => {
    render(<MovePlayer {...baseProps} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Fireman Spin' })).toBeInTheDocument();
  });

  it('renders the difficulty chip', () => {
    render(<MovePlayer {...baseProps} />);
    expect(screen.getByText('Beginner')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<MovePlayer {...baseProps} />);
    expect(screen.getByText('A graceful spinning move.')).toBeInTheDocument();
  });

  it('renders the category as a tag', () => {
    render(<MovePlayer {...baseProps} />);
    expect(screen.getByText('Spins')).toBeInTheDocument();
  });

  it('renders poleType as a tag when provided', () => {
    render(<MovePlayer {...baseProps} poleType="STATIC" />);
    expect(screen.getByText('Static')).toBeInTheDocument();
  });

  it('does not render poleType tag when null', () => {
    render(<MovePlayer {...baseProps} poleType={null} />);
    expect(screen.queryByText('Static')).not.toBeInTheDocument();
    expect(screen.queryByText('Spin')).not.toBeInTheDocument();
  });

  it('renders MoveProgressPicker when authenticated', () => {
    render(<MovePlayer {...baseProps} isAuthenticated={true} />);
    expect(screen.getByTestId('progress-picker')).toBeInTheDocument();
  });

  it('does not render MoveProgressPicker when unauthenticated', () => {
    render(<MovePlayer {...baseProps} isAuthenticated={false} />);
    expect(screen.queryByTestId('progress-picker')).not.toBeInTheDocument();
  });

  it('does not render description when null', () => {
    render(<MovePlayer {...baseProps} description={null} />);
    expect(screen.queryByText('A graceful spinning move.')).not.toBeInTheDocument();
  });

  it('seeks immediately when already at top (scrollY === 0)', async () => {
    const user = userEvent.setup();
    render(<MovePlayer {...baseProps} />);
    await user.click(screen.getByRole('button', { name: 'seek' }));
    expect(scrollToMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('move-hero')).toHaveAttribute('data-seek-to', '45');
  });

  it('scrolls to top and seeks after delay when not at top', () => {
    vi.useFakeTimers();
    vi.stubGlobal('scrollY', 200);
    render(<MovePlayer {...baseProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'seek' }));
    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(screen.getByTestId('move-hero')).toHaveAttribute('data-seek-to', '');
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByTestId('move-hero')).toHaveAttribute('data-seek-to', '45');
    vi.stubGlobal('scrollY', 0);
    vi.useRealTimers();
  });
});
