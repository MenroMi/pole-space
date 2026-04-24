import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { MoveWithTags } from '../types';

import MoveCard from './MoveCard';

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const baseMove: MoveWithTags = {
  id: 'move-1',
  title: 'Jade Split',
  description: 'A beautiful aerial move requiring flexibility.',
  difficulty: 'BEGINNER',
  category: 'SPINS',
  poleType: null,
  youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  imageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
};

describe('MoveCard', () => {
  it('renders title', () => {
    render(<MoveCard move={baseMove} />);
    expect(screen.getByText('Jade Split')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<MoveCard move={baseMove} />);
    expect(screen.getByText('A beautiful aerial move requiring flexibility.')).toBeInTheDocument();
  });

  it('renders difficulty badge', () => {
    render(<MoveCard move={baseMove} />);
    expect(screen.getByText('BEGINNER')).toBeInTheDocument();
  });

  it('falls back to YouTube thumbnail when imageUrl is null', () => {
    render(<MoveCard move={baseMove} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });

  it('uses imageUrl when provided', () => {
    const move = {
      ...baseMove,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    };
    render(<MoveCard move={move} />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://res.cloudinary.com/demo/image/upload/sample.jpg');
  });

  it('renders up to 3 tags and hides the rest', () => {
    const move = {
      ...baseMove,
      tags: [
        { id: '1', name: 'flexibility' },
        { id: '2', name: 'strength' },
        { id: '3', name: 'core' },
        { id: '4', name: 'hidden-tag' },
      ] as MoveWithTags['tags'],
    };
    render(<MoveCard move={move} />);
    expect(screen.getByText('flexibility')).toBeInTheDocument();
    expect(screen.getByText('strength')).toBeInTheDocument();
    expect(screen.getByText('core')).toBeInTheDocument();
    expect(screen.queryByText('hidden-tag')).not.toBeInTheDocument();
  });

  it('card wraps content in a link to /moves/{id}', () => {
    render(<MoveCard move={baseMove} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/moves/move-1');
  });

  it('renders INTERMEDIATE badge with primary-container styling', () => {
    const move = { ...baseMove, difficulty: 'INTERMEDIATE' as const };
    render(<MoveCard move={move} />);
    const badge = screen.getByText('INTERMEDIATE');
    expect(badge.className).toContain('bg-primary-container');
    expect(badge.className).toContain('text-on-surface');
  });

  it('renders placeholder icon when imageUrl is null and youtubeUrl has no valid id', () => {
    const move = { ...baseMove, imageUrl: null, youtubeUrl: '' };
    const { container } = render(<MoveCard move={move} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // lucide icons render as svg
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
