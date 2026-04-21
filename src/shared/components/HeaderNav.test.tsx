import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import HeaderNav from './HeaderNav'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

describe('HeaderNav', () => {
  it('renders Catalog and Moves links with correct hrefs', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<HeaderNav />)
    expect(screen.getByRole('link', { name: 'Catalog' })).toHaveAttribute('href', '/catalog')
    expect(screen.getByRole('link', { name: 'Moves' })).toHaveAttribute('href', '/moves')
  })

  it('applies active class to the link matching the current path', () => {
    vi.mocked(usePathname).mockReturnValue('/catalog')
    render(<HeaderNav />)
    expect(screen.getByRole('link', { name: 'Catalog' }).className).toContain('text-primary')
  })

  it('does not apply active class to non-matching links', () => {
    vi.mocked(usePathname).mockReturnValue('/catalog')
    render(<HeaderNav />)
    expect(screen.getByRole('link', { name: 'Moves' }).className).not.toContain('text-primary')
  })

  it('marks /moves as active when pathname starts with /moves', () => {
    vi.mocked(usePathname).mockReturnValue('/moves/abc123')
    render(<HeaderNav />)
    expect(screen.getByRole('link', { name: 'Moves' }).className).toContain('text-primary')
  })
})
