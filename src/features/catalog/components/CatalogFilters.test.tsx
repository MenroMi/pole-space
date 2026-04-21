import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import CatalogFilters from './CatalogFilters';

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }));

describe('CatalogFilters', () => {
  let mockReplace: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReplace = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ replace: mockReplace } as ReturnType<typeof useRouter>);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('clicking a category calls router.replace with ?category=SPINS', () => {
    render(<CatalogFilters filters={{}} />);
    fireEvent.click(screen.getByRole('button', { name: 'SPINS' }));
    expect(mockReplace).toHaveBeenCalledWith('/catalog?category=SPINS');
  });

  it('clicking a difficulty sub-item calls router.replace with category and difficulty', () => {
    render(<CatalogFilters filters={{}} />);
    const spinsButton = screen.getByRole('button', { name: 'SPINS' });
    const spinsSection = spinsButton.parentElement!;
    fireEvent.click(within(spinsSection).getByRole('button', { name: 'BEGINNER in SPINS' }));
    expect(mockReplace).toHaveBeenCalledWith('/catalog?category=SPINS&difficulty=BEGINNER');
  });

  it('clicking category clears existing difficulty param', () => {
    render(<CatalogFilters filters={{ category: 'SPINS', difficulty: 'BEGINNER' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'SPINS' }));
    expect(mockReplace).toHaveBeenCalledWith('/catalog?category=SPINS');
  });

  it('clicking category preserves existing search param', () => {
    render(<CatalogFilters filters={{ search: 'jade' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'SPINS' }));
    expect(mockReplace).toHaveBeenCalledWith('/catalog?category=SPINS&search=jade');
  });

  it('clicking difficulty preserves existing search param', () => {
    render(<CatalogFilters filters={{ category: 'SPINS', search: 'jade' }} />);
    const spinsButton = screen.getByRole('button', { name: 'SPINS' });
    const spinsSection = spinsButton.parentElement!;
    fireEvent.click(within(spinsSection).getByRole('button', { name: 'BEGINNER in SPINS' }));
    expect(mockReplace).toHaveBeenCalledWith(
      '/catalog?category=SPINS&difficulty=BEGINNER&search=jade',
    );
  });

  it('clicking category during typing includes typed value in URL', () => {
    render(<CatalogFilters filters={{}} />);
    fireEvent.change(screen.getByRole('textbox', { name: /search/i }), {
      target: { value: 'jade' },
    });
    // click happens BEFORE the 300ms debounce fires
    fireEvent.click(screen.getByRole('button', { name: 'SPINS' }));
    expect(mockReplace).toHaveBeenCalledWith('/catalog?category=SPINS&search=jade');
  });

  it('clicking category during typing cancels pending debounce (no later duplicate call)', () => {
    render(<CatalogFilters filters={{}} />);
    fireEvent.change(screen.getByRole('textbox', { name: /search/i }), {
      target: { value: 'jade' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'SPINS' }));
    mockReplace.mockClear();
    act(() => vi.advanceTimersByTime(500));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('active category link has text-primary class', () => {
    render(<CatalogFilters filters={{ category: 'SPINS' }} />);
    expect(screen.getByRole('button', { name: 'SPINS' }).className).toContain('text-primary');
  });

  it('active difficulty sub-item has text-primary class', () => {
    render(<CatalogFilters filters={{ category: 'SPINS', difficulty: 'INTERMEDIATE' }} />);
    const spinsButton = screen.getByRole('button', { name: 'SPINS' });
    const spinsSection = spinsButton.parentElement!;
    expect(
      within(spinsSection).getByRole('button', { name: 'INTERMEDIATE in SPINS' }).className,
    ).toContain('text-primary');
  });

  it('Clear filters button is visible when a filter is active', () => {
    render(<CatalogFilters filters={{ category: 'SPINS' }} />);
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('Clear filters button is hidden when no filters are active', () => {
    render(<CatalogFilters filters={{}} />);
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it('Clear filters calls router.replace with /catalog', () => {
    render(<CatalogFilters filters={{ category: 'SPINS' }} />);
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(mockReplace).toHaveBeenCalledWith('/catalog');
  });

  it('Clear filters resets the search input value', () => {
    render(<CatalogFilters filters={{ search: 'jade' }} />);
    const input = screen.getByRole('textbox', { name: /search/i }) as HTMLInputElement;
    expect(input.value).toBe('jade');
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(input.value).toBe('');
  });

  it('search input triggers router.replace after 300ms debounce', () => {
    render(<CatalogFilters filters={{}} />);
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'jade' } });
    expect(mockReplace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(350));
    expect(mockReplace).toHaveBeenCalledWith('/catalog?search=jade');
  });

  it('search does not trigger router.replace before debounce fires', () => {
    render(<CatalogFilters filters={{}} />);
    const input = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(input, { target: { value: 'jade' } });
    act(() => vi.advanceTimersByTime(100));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not trigger router.replace on initial mount', () => {
    render(<CatalogFilters filters={{}} />);
    act(() => vi.advanceTimersByTime(500));
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
