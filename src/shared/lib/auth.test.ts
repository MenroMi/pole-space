import { describe, it, expect, vi } from 'vitest'

vi.mock('next-auth', () => ({
  default: (config: unknown) => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}))

import { authConfig } from './auth'

describe('authConfig', () => {
  it('includes google, facebook, and credentials providers', () => {
    const ids = authConfig.providers.map((p: { id: string }) => p.id)
    expect(ids).toContain('google')
    expect(ids).toContain('facebook')
    expect(ids).toContain('credentials')
  })

  it('uses jwt session strategy', () => {
    expect(authConfig.session?.strategy).toBe('jwt')
  })
})
