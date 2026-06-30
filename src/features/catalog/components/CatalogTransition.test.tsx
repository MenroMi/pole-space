import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { LocalizedMoveWithTags } from '../types';

vi.mock('./MoveCard', () => ({
  default: ({ move }: { move: LocalizedMoveWithTags }) => (
    <div data-testid="move-card">{move.title}</div>
  ),
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children?: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useRouter: vi.fn(),
  usePathname: () => '/catalog',
}));

import { CatalogTransitionContext } from './CatalogTransitionContext';
import MoveGrid from './MoveGrid';

const baseMove = {
  id: 'm1',
  title: 'Spin',
  description: null,
  difficulty: 'BEGINNER' as const,
  category: 'SPINS',
  poleTypes: [] as [],
  youtubeUrl: '',
  imageUrl: null,
  focalX: 0.5,
  focalY: 0.5,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [] as [],
  stepsData: null,
  gripType: null,
  entry: null,
  coachNote: null,
  coachNoteAuthor: null,
  duration: null,
};

describe('catalog pending', () => {
  it('dims the grid while a filter transition is pending', () => {
    const { container } = render(
      <CatalogTransitionContext.Provider
        value={{ isPending: true, startFilterTransition: (fn) => fn() }}
      >
        <MoveGrid
          initialMoves={[baseMove]}
          initialHasMore={false}
          totalCount={1}
          filters={{}}
          locale="en"
        />
      </CatalogTransitionContext.Provider>,
    );
    const dimmed = container.querySelector('[data-pending="true"]') as HTMLElement;
    expect(dimmed).not.toBeNull();
    expect(dimmed.style.opacity).toBe('0.5');
  });
});
