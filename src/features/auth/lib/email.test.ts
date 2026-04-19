import { describe, it, expect, vi, beforeEach } from 'vitest'

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
import * as resendModule from 'resend'

const mockSend = (resendModule as any).__mockSend

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
      })
    )
  })

  it('throws if Resend returns an error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'API error' } })

    await expect(sendVerificationEmail('user@example.com', 'abc-token-123')).rejects.toThrow()
  })
})
