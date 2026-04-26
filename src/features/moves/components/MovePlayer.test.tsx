import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const scrollToMock = vi.fn();
vi.stubGlobal('scrollTo', scrollToMock);

import type { StepItem } from '../types';

vi.mock('./MoveHero', () => ({
  default: vi.fn(({ seekTo }: { seekTo?: number }) => (
    <div data-testid="move-hero" data-seek-to={seekTo ?? ''} />
  )),
}));

vi.mock('./MoveTabs', () => ({
  default: vi.fn(({ onSeek }: { onSeek: (s: number) => void }) => (
    <button type="button" onClick={() => onSeek(45)}>
      seek
    </button>
  )),
}));

import MovePlayer from './MovePlayer';

const baseProps = {
  title: 'Fireman Spin',
  youtubeUrl: 'https://www.youtube.com/watch?v=abc123',
  imageUrl: null,
  stepsData: [] as StepItem[],
};

describe('MovePlayer', () => {
  beforeEach(() => scrollToMock.mockClear());

  it('renders MoveHero and MoveTabs', () => {
    render(<MovePlayer {...baseProps}>content</MovePlayer>);
    expect(screen.getByTestId('move-hero')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'seek' })).toBeInTheDocument();
  });

  it('renders children between hero and tabs', () => {
    render(
      <MovePlayer {...baseProps}>
        <p>static content</p>
      </MovePlayer>,
    );
    expect(screen.getByText('static content')).toBeInTheDocument();
  });

  it('passes undefined seekTo to MoveHero initially', () => {
    render(<MovePlayer {...baseProps}>content</MovePlayer>);
    expect(screen.getByTestId('move-hero')).toHaveAttribute('data-seek-to', '');
  });

  it('seeks immediately when already at top (scrollY === 0)', async () => {
    const user = userEvent.setup();
    render(<MovePlayer {...baseProps}>content</MovePlayer>);
    await user.click(screen.getByRole('button', { name: 'seek' }));
    expect(scrollToMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('move-hero')).toHaveAttribute('data-seek-to', '45');
  });

  describe('when scrolled down', () => {
    beforeEach(() => {
      vi.stubGlobal('scrollY', 500);
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.stubGlobal('scrollY', 0);
    });

    it('scrolls to top before seeking', () => {
      render(<MovePlayer {...baseProps}>content</MovePlayer>);
      fireEvent.click(screen.getByRole('button', { name: 'seek' }));
      expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      expect(screen.getByTestId('move-hero')).toHaveAttribute('data-seek-to', '');
    });

    it('seeks after 400ms scroll delay', () => {
      render(<MovePlayer {...baseProps}>content</MovePlayer>);
      fireEvent.click(screen.getByRole('button', { name: 'seek' }));
      act(() => vi.advanceTimersByTime(400));
      expect(screen.getByTestId('move-hero')).toHaveAttribute('data-seek-to', '45');
    });
  });
});
