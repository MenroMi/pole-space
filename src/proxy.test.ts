import { describe, it, expect, vi } from 'vitest'

vi.mock('@/shared/lib/auth', () => ({
  auth: vi.fn((handler: unknown) => handler),
}))

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: vi.fn((url: URL) => ({ redirectUrl: url })),
  },
}))

import { getProtectedRedirect } from './proxy'

describe('getProtectedRedirect', () => {
  it('returns null for a public route regardless of auth state', () => {
    expect(getProtectedRedirect('/', false, 'http://localhost')).toBeNull()
    expect(getProtectedRedirect('/catalog', false, 'http://localhost')).toBeNull()
    expect(getProtectedRedirect('/login', false, 'http://localhost')).toBeNull()
  })

  it('returns null for a protected route when the user is authenticated', () => {
    expect(getProtectedRedirect('/profile', true, 'http://localhost')).toBeNull()
    expect(getProtectedRedirect('/admin/dashboard', true, 'http://localhost')).toBeNull()
  })

  it('returns a redirect URL for /profile when unauthenticated', () => {
    const url = getProtectedRedirect('/profile', false, 'http://localhost')
    expect(url).not.toBeNull()
    expect(url!.pathname).toBe('/login')
    expect(url!.searchParams.get('callbackUrl')).toBe('/profile')
  })

  it('returns a redirect URL for /admin sub-path when unauthenticated', () => {
    const url = getProtectedRedirect('/admin/moves', false, 'http://localhost')
    expect(url).not.toBeNull()
    expect(url!.pathname).toBe('/login')
    expect(url!.searchParams.get('callbackUrl')).toBe('/admin/moves')
  })

  it('preserves query string in callbackUrl', () => {
    const url = getProtectedRedirect('/admin', false, 'http://localhost', '?filter=active')
    expect(url).not.toBeNull()
    expect(url!.searchParams.get('callbackUrl')).toBe('/admin?filter=active')
  })
})
