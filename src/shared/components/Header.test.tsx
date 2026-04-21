import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { auth } from '@/shared/lib/auth'

import Header from './Header'

vi.mock('@/shared/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('./HeaderNav', () => ({ default: () => <nav data-testid="header-nav" /> }))

const mockAuth = auth as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

describe('Header', () => {
  it('renders wordmark linking to /', async () => {
    mockAuth.mockResolvedValue(null)
    render(await Header())
    expect(screen.getByRole('link', { name: /kinetic gallery/i })).toHaveAttribute('href', '/')
  })

  it('renders HeaderNav', async () => {
    mockAuth.mockResolvedValue(null)
    render(await Header())
    expect(screen.getByTestId('header-nav')).toBeInTheDocument()
  })

  it('links account icon to /profile when session exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'USER' } })
    render(await Header())
    expect(screen.getByTestId('account-link')).toHaveAttribute('href', '/profile')
  })

  it('links account icon to /login when no session', async () => {
    mockAuth.mockResolvedValue(null)
    render(await Header())
    expect(screen.getByTestId('account-link')).toHaveAttribute('href', '/login')
  })
})
