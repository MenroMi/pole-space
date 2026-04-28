import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import RelatedMoves from './RelatedMoves';

const makeMove = (overrides: Partial<Parameters<typeof RelatedMoves>[0]['moves'][0]> = {}) => ({
  id: 'move-1',
  title: 'Fireman Spin',
  difficulty: 'BEGINNER',
  imageUrl: null,
  youtubeUrl: 'https://youtube.com/watch?v=abc1234abcd',
  ...overrides,
});

describe('RelatedMoves', () => {
  it('renders nothing when moves array is empty', () => {
    const { container } = render(<RelatedMoves moves={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a link to each move', () => {
    render(<RelatedMoves moves={[makeMove()]} />);
    expect(screen.getByRole('link', { name: /fireman spin/i })).toHaveAttribute(
      'href',
      '/moves/move-1',
    );
  });

  it('renders difficulty in uppercase', () => {
    render(<RelatedMoves moves={[makeMove({ difficulty: 'INTERMEDIATE' })]} />);
    expect(screen.getByText('INTERMEDIATE')).toBeInTheDocument();
  });

  it('renders up to 4 moves', () => {
    const moves = Array.from({ length: 4 }, (_, i) =>
      makeMove({ id: `m-${i}`, title: `Move ${i}` }),
    );
    render(<RelatedMoves moves={moves} />);
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });
});
