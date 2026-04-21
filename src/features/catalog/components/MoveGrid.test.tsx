import { render, screen, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { getMovesAction } from '../actions'
import type { MoveWithTags } from '../types'

import MoveGrid from './MoveGrid'

vi.mock('../actions', () => ({ getMovesAction: vi.fn() }))

vi.mock('./MoveCard', () => ({
  default: ({ move }: { move: MoveWithTags }) => <div data-testid="move-card">{move.title}</div>,
}))

const mockGetMovesAction = getMovesAction as ReturnType<typeof vi.fn>

function makeMoves(count: number, offset = 0): MoveWithTags[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `move-${offset + i}`,
    title: `Move ${offset + i}`,
    description: null,
    difficulty: 'BEGINNER' as const,
    category: 'SPINS' as const,
    youtubeUrl: '',
    imageUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: [],
  }))
}

const initialMoves = makeMoves(12)

const observeMock = vi.fn()
const disconnectMock = vi.fn()
let capturedObserverCallback: IntersectionObserverCallback

beforeEach(() => {
  vi.clearAllMocks()
  observeMock.mockReset()
  disconnectMock.mockReset()
  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(function (this: unknown, cb: IntersectionObserverCallback) {
      capturedObserverCallback = cb
      return { observe: observeMock, disconnect: disconnectMock }
    }),
  )
})

describe('MoveGrid', () => {
  it('renders all initialMoves', () => {
    render(<MoveGrid initialMoves={initialMoves} initialHasMore={true} filters={{}} />)
    expect(screen.getAllByTestId('move-card')).toHaveLength(12)
  })

  it('observes sentinel when hasMore is true', () => {
    render(<MoveGrid initialMoves={initialMoves} initialHasMore={true} filters={{}} />)
    expect(observeMock).toHaveBeenCalled()
  })

  it('does not observe sentinel when initialHasMore is false', () => {
    render(<MoveGrid initialMoves={makeMoves(5)} initialHasMore={false} filters={{}} />)
    expect(observeMock).not.toHaveBeenCalled()
  })

  it('calls getMovesAction with page 2 when sentinel is intersecting', async () => {
    const newMoves = makeMoves(5, 12)
    mockGetMovesAction.mockResolvedValue({ items: newMoves, total: 17, page: 2, pageSize: 12 })

    render(<MoveGrid initialMoves={initialMoves} initialHasMore={true} filters={{}} />)

    await act(async () => {
      capturedObserverCallback(
        [{ isIntersecting: true }] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      )
    })

    expect(mockGetMovesAction).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 12 }),
    )
  })

  it('appends new moves to existing list after load more', async () => {
    const newMoves = makeMoves(5, 12)
    mockGetMovesAction.mockResolvedValue({ items: newMoves, total: 17, page: 2, pageSize: 12 })

    render(<MoveGrid initialMoves={initialMoves} initialHasMore={true} filters={{}} />)

    await act(async () => {
      capturedObserverCallback(
        [{ isIntersecting: true }] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      )
    })

    await waitFor(() => {
      expect(screen.getAllByTestId('move-card')).toHaveLength(17)
    })
  })

  it('passes filters to getMovesAction', async () => {
    const newMoves = makeMoves(3, 12)
    mockGetMovesAction.mockResolvedValue({ items: newMoves, total: 15, page: 2, pageSize: 12 })

    render(
      <MoveGrid
        initialMoves={initialMoves}
        initialHasMore={true}
        filters={{ category: 'SPINS', difficulty: 'BEGINNER' }}
      />,
    )

    await act(async () => {
      capturedObserverCallback(
        [{ isIntersecting: true }] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      )
    })

    expect(mockGetMovesAction).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'SPINS', difficulty: 'BEGINNER', page: 2 }),
    )
  })

  it('stops observing when last page is loaded (items < pageSize)', async () => {
    const lastPageMoves = makeMoves(5, 12)
    mockGetMovesAction.mockResolvedValue({ items: lastPageMoves, total: 17, page: 2, pageSize: 12 })

    render(<MoveGrid initialMoves={initialMoves} initialHasMore={true} filters={{}} />)

    await act(async () => {
      capturedObserverCallback(
        [{ isIntersecting: true }] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      )
    })

    await waitFor(() => {
      expect(screen.queryByTestId('sentinel')).not.toBeInTheDocument()
    })
  })

  it('shows loading spinner while fetching', async () => {
    let resolveLoad!: (value: unknown) => void
    mockGetMovesAction.mockReturnValue(
      new Promise((res) => {
        resolveLoad = res
      }),
    )

    render(<MoveGrid initialMoves={initialMoves} initialHasMore={true} filters={{}} />)

    act(() => {
      capturedObserverCallback(
        [{ isIntersecting: true }] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      )
    })

    expect(await screen.findByTestId('loading-spinner')).toBeInTheDocument()

    await act(async () => {
      resolveLoad({ items: [], total: 12, page: 2, pageSize: 12 })
    })
  })

  it('does not setState after unmount during fetch', async () => {
    let resolveLoad!: (value: unknown) => void
    mockGetMovesAction.mockReturnValue(
      new Promise((res) => {
        resolveLoad = res
      }),
    )

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { unmount } = render(
      <MoveGrid initialMoves={initialMoves} initialHasMore={true} filters={{}} />,
    )

    act(() => {
      capturedObserverCallback(
        [{ isIntersecting: true }] as IntersectionObserverEntry[],
        {} as IntersectionObserver,
      )
    })

    unmount()

    await act(async () => {
      resolveLoad({
        items: [
          {
            id: 'm12',
            title: 'Late',
            description: null,
            difficulty: 'BEGINNER',
            category: 'SPINS',
            youtubeUrl: '',
            imageUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: [],
          },
        ],
        total: 13,
        page: 2,
        pageSize: 12,
      })
    })

    const stateUpdateWarning = consoleError.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('unmounted component'),
    )
    expect(stateUpdateWarning).toBeUndefined()

    consoleError.mockRestore()
  })
})
