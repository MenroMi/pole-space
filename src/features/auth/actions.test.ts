import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_pw'),
    compare: vi.fn(),
  },
}))
vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))
vi.mock('@/features/auth/lib/tokens', () => ({
  generateVerificationToken: vi.fn().mockResolvedValue('mock-token'),
  deleteUserTokens: vi.fn(),
}))
vi.mock('@/features/auth/lib/email', () => ({
  sendVerificationEmail: vi.fn(),
}))

import { redirect } from 'next/navigation'
import { prisma } from '@/shared/lib/prisma'
import { generateVerificationToken, deleteUserTokens } from '@/features/auth/lib/tokens'
import { sendVerificationEmail } from '@/features/auth/lib/email'
import { signupAction } from './actions'

const mockFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>
const mockCreate = prisma.user.create as ReturnType<typeof vi.fn>
const mockDelete = prisma.user.delete as ReturnType<typeof vi.fn>
const mockGenToken = generateVerificationToken as ReturnType<typeof vi.fn>
const mockDeleteTokens = deleteUserTokens as ReturnType<typeof vi.fn>
const mockSendEmail = sendVerificationEmail as ReturnType<typeof vi.fn>
const mockRedirect = redirect as ReturnType<typeof vi.fn>

const validData = { name: 'Alice', email: 'alice@example.com', password: 'password123' }

beforeEach(() => vi.clearAllMocks())

describe('signupAction', () => {
  it('returns error if email is already in use', async () => {
    mockFindUnique.mockResolvedValue({ id: 'existing-user' })

    const result = await signupAction(validData)

    expect(result).toEqual({ error: 'Email already in use' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates user, generates token, sends email, and redirects on success', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'new-user' })
    mockSendEmail.mockResolvedValue(undefined)

    await signupAction(validData)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'alice@example.com',
          emailVerified: null,
        }),
      })
    )
    expect(mockGenToken).toHaveBeenCalledWith('alice@example.com')
    expect(mockSendEmail).toHaveBeenCalledWith('alice@example.com', 'mock-token')
    expect(mockRedirect).toHaveBeenCalledWith('/verify-email?sent=true')
  })

  it('deletes user and tokens if Resend fails', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'new-user' })
    mockSendEmail.mockRejectedValue(new Error('Resend API error'))

    const result = await signupAction(validData)

    expect(mockDeleteTokens).toHaveBeenCalledWith('alice@example.com')
    expect(mockDelete).toHaveBeenCalledWith({ where: { email: 'alice@example.com' } })
    expect(result).toEqual({ error: 'Failed to send email, please try again' })
  })

  it('returns error for invalid input (Zod)', async () => {
    const result = await signupAction({ name: 'A', email: 'bad', password: 'short' })
    expect(result).toEqual({ error: 'Invalid input' })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })
})
