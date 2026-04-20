import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import Footer from './Footer'

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }))

beforeEach(() => vi.clearAllMocks())

describe('Footer', () => {
  it('renders all nav links with correct hrefs', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<Footer />)
    expect(screen.getByRole('link', { name: /gallery/i })).toHaveAttribute('href', '/catalog')
    expect(screen.getByRole('link', { name: /moves/i })).toHaveAttribute('href', '/moves')
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/profile')
  })

  it('applies active class to Gallery when pathname is /catalog', () => {
    vi.mocked(usePathname).mockReturnValue('/catalog')
    render(<Footer />)
    expect(screen.getByRole('link', { name: /gallery/i }).className).toContain('text-primary')
  })

  it('does not apply active class to non-matching links', () => {
    vi.mocked(usePathname).mockReturnValue('/catalog')
    render(<Footer />)
    expect(screen.getByRole('link', { name: /profile/i }).className).not.toContain('text-primary')
  })

  it('renders the version label', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<Footer />)
    expect(screen.getByText(/kinetic gallery v\.0\.1/i)).toBeInTheDocument()
  })
})
