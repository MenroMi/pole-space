import bcrypt from 'bcryptjs'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth', () => ({
  default: (_config: unknown) => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}))
vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}))

import { prisma } from '@/shared/lib/prisma'

import { authConfig } from './auth'

const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>
const mockCompare = bcrypt.compare as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

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

describe('authorize', () => {
  const getAuthorize = () => {
    const provider = authConfig.providers.find(
      (p: { id: string }) => p.id === 'credentials',
    ) as unknown as { options: { authorize: (creds: Record<string, string>) => Promise<unknown> } }
    return provider.options.authorize
  }

  it('returns null if credentials are missing', async () => {
    const authorize = getAuthorize()
    const result = await authorize({})
    expect(result).toBeNull()
  })

  it('returns null if user not found', async () => {
    mockFindUnique.mockResolvedValue(null)
    const authorize = getAuthorize()
    const result = await authorize({ email: 'a@b.com', password: 'pass' })
    expect(result).toBeNull()
  })

  it('throws if emailVerified is null', async () => {
    mockFindUnique.mockResolvedValue({ id: '1', password: 'hashed', emailVerified: null })
    const authorize = getAuthorize()
    await expect(authorize({ email: 'a@b.com', password: 'pass' })).rejects.toThrow(
      'Please verify your email first',
    )
  })

  it('returns null if password does not match', async () => {
    mockFindUnique.mockResolvedValue({ id: '1', password: 'hashed', emailVerified: new Date() })
    mockCompare.mockResolvedValue(false)
    const authorize = getAuthorize()
    const result = await authorize({ email: 'a@b.com', password: 'wrong' })
    expect(result).toBeNull()
  })

  it('returns user if credentials are valid and email is verified', async () => {
    const user = { id: '1', password: 'hashed', emailVerified: new Date() }
    mockFindUnique.mockResolvedValue(user)
    mockCompare.mockResolvedValue(true)
    const authorize = getAuthorize()
    const result = await authorize({ email: 'a@b.com', password: 'correct' })
    expect(result).toEqual(user)
  })
})
