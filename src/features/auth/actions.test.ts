import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    const e = new Error('NEXT_REDIRECT')
    ;(e as unknown as Record<string, unknown>).digest = `NEXT_REDIRECT;replace;${url};307;`
    throw e
  }),
}))
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
vi.mock('@/shared/lib/auth', () => ({
  signIn: vi.fn(),
}))
vi.mock('next-auth', async () => {
  class AuthError extends Error {
    cause?: unknown
    type?: string
  }
  return { AuthError }
})

import { redirect } from 'next/navigation'
import { prisma } from '@/shared/lib/prisma'
import { generateVerificationToken, deleteUserTokens } from '@/features/auth/lib/tokens'
import { sendVerificationEmail } from '@/features/auth/lib/email'
import { signupAction, loginAction, resendVerificationAction } from './actions'
import { signIn } from '@/shared/lib/auth'

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

    await expect(signupAction(validData)).rejects.toThrow('NEXT_REDIRECT')

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

const mockSignIn = signIn as ReturnType<typeof vi.fn>

describe('loginAction', () => {
  it('calls signIn with credentials and redirectTo /catalog', async () => {
    mockSignIn.mockResolvedValue(undefined)

    const result = await loginAction({ email: 'a@b.com', password: 'pass' })

    expect(result).toBeUndefined()
    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'a@b.com',
      password: 'pass',
      redirectTo: '/catalog',
    })
  })

  it('returns generic error for invalid credentials (AuthError without cause.err)', async () => {
    const authError = Object.assign(new Error('CredentialsSignin'), {
      type: 'CredentialsSignin',
      cause: undefined,
    })
    Object.setPrototypeOf(authError, (await import('next-auth')).AuthError.prototype)
    mockSignIn.mockRejectedValue(authError)

    const result = await loginAction({ email: 'a@b.com', password: 'wrong' })

    expect(result).toEqual({ error: 'Invalid credentials' })
  })

  it('returns cause error message when authorize throws a specific error', async () => {
    const authError = Object.assign(new Error('CredentialsSignin'), {
      type: 'CredentialsSignin',
      cause: { err: new Error('Please verify your email first') },
    })
    Object.setPrototypeOf(authError, (await import('next-auth')).AuthError.prototype)
    mockSignIn.mockRejectedValue(authError)

    const result = await loginAction({ email: 'a@b.com', password: 'pass' })

    expect(result).toEqual({ error: 'Please verify your email first' })
  })

  it('re-throws non-AuthError errors (e.g. NEXT_REDIRECT)', async () => {
    const redirectError = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT' })
    mockSignIn.mockRejectedValue(redirectError)

    await expect(loginAction({ email: 'a@b.com', password: 'pass' })).rejects.toThrow('NEXT_REDIRECT')
  })
})

describe('resendVerificationAction', () => {
  it('deletes old tokens, generates new token, sends email, then redirects', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-id', emailVerified: null })
    mockSendEmail.mockResolvedValue(undefined)

    await expect(resendVerificationAction('alice@example.com')).rejects.toThrow('NEXT_REDIRECT')

    expect(mockDeleteTokens).toHaveBeenCalledWith('alice@example.com')
    expect(mockGenToken).toHaveBeenCalledWith('alice@example.com')
    expect(mockSendEmail).toHaveBeenCalledWith('alice@example.com', 'mock-token')
    expect(mockRedirect).toHaveBeenCalledWith('/verify-email?sent=true')
  })

  it('redirects to invalid if user not found', async () => {
    mockFindUnique.mockResolvedValue(null)

    await expect(resendVerificationAction('nobody@example.com')).rejects.toThrow('NEXT_REDIRECT')

    expect(mockRedirect).toHaveBeenCalledWith('/verify-email?error=invalid')
    expect(mockGenToken).not.toHaveBeenCalled()
  })

  it('redirects to invalid if user already verified', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-id', emailVerified: new Date() })

    await expect(resendVerificationAction('verified@example.com')).rejects.toThrow('NEXT_REDIRECT')

    expect(mockRedirect).toHaveBeenCalledWith('/verify-email?error=invalid')
    expect(mockGenToken).not.toHaveBeenCalled()
  })

  it('deletes token and redirects to send-failed if email sending fails', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-id', emailVerified: null })
    mockSendEmail.mockRejectedValue(new Error('Resend error'))

    await expect(resendVerificationAction('alice@example.com')).rejects.toThrow('NEXT_REDIRECT')

    expect(mockDeleteTokens).toHaveBeenCalledWith('alice@example.com')
    expect(mockRedirect).toHaveBeenCalledWith('/verify-email?error=send-failed')
  })
})
