import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import CatalogFilters from './CatalogFilters'

vi.mock('next/navigation', () => ({ useRouter: vi.fn() }))

describe('CatalogFilters', () => {
  let mockReplace: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockReplace = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ replace: mockReplace } as ReturnType<typeof useRouter>)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders all 5 category triggers', () => {
    render(<CatalogFilters filters={{}} />)
    expect(screen.getByRole('button', { name: 'SPINS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CLIMBS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'HOLDS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'COMBOS' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'FLOORWORK' })).toBeInTheDocument()
  })

  it('clicking a category trigger does not navigate (expand only)', () => {
    render(<CatalogFilters filters={{}} />)
    fireEvent.click(screen.getByRole('button', { name: 'SPINS' }))
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('clicking "All levels" inside SPINS navigates with category only', () => {
    render(<CatalogFilters filters={{ category: 'SPINS' }} />)
    // SPINS auto-expanded; "All levels" visible in tree
    fireEvent.click(screen.getByRole('button', { name: 'All levels' }))
    expect(mockReplace).toHaveBeenCalledWith('/catalog?category=SPINS')
  })

  it('clicking a difficulty inside a category navigates with both params', () => {
    render(<CatalogFilters filters={{ category: 'SPINS' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'BEGINNER in SPINS' }))
    expect(mockReplace).toHaveBeenCalledWith('/catalog?category=SPINS&difficulty=BEGINNER')
  })

  it('clicking "All levels" clears existing difficulty', () => {
    render(<CatalogFilters filters={{ category: 'SPINS', difficulty: 'BEGINNER' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'All levels' }))
    expect(mockReplace).toHaveBeenCalledWith('/catalog?category=SPINS')
  })

  it('clicking a difficulty preserves existing search', () => {
    render(<CatalogFilters filters={{ category: 'SPINS', search: 'jade' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'BEGINNER in SPINS' }))
    expect(mockReplace).toHaveBeenCalledWith('/catalog?category=SPINS&difficulty=BEGINNER&search=jade')
  })

  it('clicking a difficulty during typing includes typed value', () => {
    render(<CatalogFilters filters={{ category: 'SPINS' }} />)
    fireEvent.change(screen.getByRole('textbox', { name: /search/i }), {
      target: { value: 'jade' },
    })
    // click happens BEFORE debounce fires
    fireEvent.click(screen.getByRole('button', { name: 'BEGINNER in SPINS' }))
    expect(mockReplace).toHaveBeenCalledWith('/catalog?category=SPINS&difficulty=BEGINNER&search=jade')
  })

  it('clicking a difficulty during typing cancels pending debounce (no duplicate)', () => {
    render(<CatalogFilters filters={{ category: 'SPINS' }} />)
    fireEvent.change(screen.getByRole('textbox', { name: /search/i }), {
      target: { value: 'jade' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'BEGINNER in SPINS' }))
    mockReplace.mockClear()
    act(() => vi.advanceTimersByTime(500))
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('active category trigger has text-primary class', () => {
    render(<CatalogFilters filters={{ category: 'SPINS' }} />)
    expect(screen.getByRole('button', { name: 'SPINS' }).className).toContain('text-primary')
  })

  it('auto-expands active category on mount', () => {
    render(<CatalogFilters filters={{ category: 'SPINS' }} />)
    expect(screen.getByRole('button', { name: 'SPINS' })).toHaveAttribute('data-state', 'open')
  })

  it('non-active category is collapsed on mount', () => {
    render(<CatalogFilters filters={{ category: 'SPINS' }} />)
    expect(screen.getByRole('button', { name: 'CLIMBS' })).toHaveAttribute('data-state', 'closed')
  })

  it('Clear filters button is visible when a filter is active', () => {
    render(<CatalogFilters filters={{ category: 'SPINS' }} />)
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument()
  })

  it('Clear filters button is hidden when no filters are active', () => {
    render(<CatalogFilters filters={{}} />)
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument()
  })

  it('Clear filters navigates to /catalog', () => {
    render(<CatalogFilters filters={{ category: 'SPINS' }} />)
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }))
    expect(mockReplace).toHaveBeenCalledWith('/catalog')
  })

  it('Clear filters resets the search input value', () => {
    render(<CatalogFilters filters={{ search: 'jade' }} />)
    const input = screen.getByRole('textbox', { name: /search/i }) as HTMLInputElement
    expect(input.value).toBe('jade')
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }))
    expect(input.value).toBe('')
  })

  it('leaves all accordions collapsed after manual collapse + Clear filters', () => {
    // Regression: Radix Accordion switches from controlled → uncontrolled if
    // value becomes undefined, which used to leave a random section open.
    const { rerender } = render(
      <CatalogFilters filters={{ category: 'SPINS', difficulty: 'BEGINNER' }} />
    )
    // User manually collapses SPINS
    fireEvent.click(screen.getByRole('button', { name: 'SPINS' }))
    expect(screen.getByRole('button', { name: 'SPINS' })).toHaveAttribute('data-state', 'closed')

    // User clicks Clear filters — parent re-renders with cleared filters
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }))
    rerender(<CatalogFilters filters={{}} />)

    // All category triggers should be closed
    for (const category of ['SPINS', 'CLIMBS', 'HOLDS', 'COMBOS', 'FLOORWORK']) {
      expect(screen.getByRole('button', { name: category })).toHaveAttribute('data-state', 'closed')
    }
  })

  it('search input triggers router.replace after 300ms debounce', () => {
    render(<CatalogFilters filters={{}} />)
    fireEvent.change(screen.getByRole('textbox', { name: /search/i }), {
      target: { value: 'jade' },
    })
    expect(mockReplace).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(350))
    expect(mockReplace).toHaveBeenCalledWith('/catalog?search=jade')
  })

  it('search does not trigger router.replace before debounce fires', () => {
    render(<CatalogFilters filters={{}} />)
    fireEvent.change(screen.getByRole('textbox', { name: /search/i }), {
      target: { value: 'jade' },
    })
    act(() => vi.advanceTimersByTime(100))
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('does not trigger router.replace on initial mount', () => {
    render(<CatalogFilters filters={{}} />)
    act(() => vi.advanceTimersByTime(500))
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
