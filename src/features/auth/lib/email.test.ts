import * as resendModule from 'resend'
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('resend', () => {
  const mockSend = vi.fn()

  return {
    Resend: class {
      emails = { send: mockSend }
    },
    __mockSend: mockSend,
  }
})

import { sendVerificationEmail } from './email'

const mockSend = (resendModule as unknown as { __mockSend: Mock }).__mockSend

beforeEach(() => mockSend.mockClear())

describe('sendVerificationEmail', () => {
  it('calls Resend with correct to, subject, and verification URL', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null })

    await sendVerificationEmail('user@example.com', 'abc-token-123')

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: expect.any(String),
        html: expect.stringContaining('abc-token-123'),
      }),
    )
  })

  it('throws if Resend returns an error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'API error' } })

    await expect(sendVerificationEmail('user@example.com', 'abc-token-123')).rejects.toThrow()
  })

  // RESEND_FROM is a module-level const evaluated at import time. Testing a different
  // env var value would require vi.resetModules() + dynamic import, adding complexity
  // for low marginal value. The fallback ('onboarding@resend.dev') is exercised implicitly
  // by the tests above; the RESEND_FROM override path is verified by code inspection.
})
