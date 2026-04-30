import * as resendModule from 'resend';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('resend', () => {
  const mockSend = vi.fn();
  return {
    Resend: class {
      emails = { send: mockSend };
    },
    __mockSend: mockSend,
  };
});

import { sendPasswordResetEmail } from './reset-email';

const mockSend = (resendModule as unknown as { __mockSend: Mock }).__mockSend;

beforeEach(() => mockSend.mockClear());

describe('sendPasswordResetEmail', () => {
  it('calls Resend with correct to, subject, and token URL', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email-id' }, error: null });

    await sendPasswordResetEmail('user@example.com', 'test-token-123');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: expect.stringContaining('reset'),
        html: expect.stringContaining('test-token-123'),
      }),
    );
  });

  it('throws if Resend returns an error', async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: 'API error' } });

    await expect(sendPasswordResetEmail('user@example.com', 'token')).rejects.toThrow();
  });
});
