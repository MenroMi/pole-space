import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    verificationToken: {
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { prisma } from '@/shared/lib/prisma'
import { generateVerificationToken, deleteVerificationToken, deleteUserTokens } from './tokens'

const mockCreate = prisma.verificationToken.create as ReturnType<typeof vi.fn>
const mockDelete = prisma.verificationToken.delete as ReturnType<typeof vi.fn>
const mockDeleteMany = prisma.verificationToken.deleteMany as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

describe('generateVerificationToken', () => {
  it('returns a UUID string', async () => {
    mockCreate.mockResolvedValue({})
    const token = await generateVerificationToken('user@example.com')
    expect(token).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('generates a unique token on each call', async () => {
    mockCreate.mockResolvedValue({})
    const a = await generateVerificationToken('user@example.com')
    const b = await generateVerificationToken('user@example.com')
    expect(a).not.toBe(b)
  })

  it('creates token in DB with correct identifier and 24h expiry', async () => {
    mockCreate.mockResolvedValue({})
    const before = Date.now()
    await generateVerificationToken('user@example.com')
    const after = Date.now()

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identifier: 'user@example.com',
          token: expect.any(String),
          expires: expect.any(Date),
        }),
      })
    )
    const expires: Date = mockCreate.mock.calls[0][0].data.expires
    const ms = expires.getTime()
    expect(ms).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000 - 100)
    expect(ms).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000 + 100)
  })
})

describe('deleteVerificationToken', () => {
  it('deletes token by token string', async () => {
    mockDelete.mockResolvedValue({})
    await deleteVerificationToken('some-token-uuid')
    expect(mockDelete).toHaveBeenCalledWith({ where: { token: 'some-token-uuid' } })
  })
})

describe('deleteUserTokens', () => {
  it('deletes all tokens for an email', async () => {
    mockDeleteMany.mockResolvedValue({ count: 2 })
    await deleteUserTokens('user@example.com')
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { identifier: 'user@example.com' } })
  })
})
