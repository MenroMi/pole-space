import { describe, it, expect } from 'vitest';

import { loginSchema, signupSchema } from './validation';

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: 'secret' });
    expect(result.success).toBe(true);
  });

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('password');
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('email');
  });
});

describe('signupSchema', () => {
  const VALID = { name: 'Alice Smith', email: 'a@b.com', password: 'Password1!' };

  it('accepts valid name, email, and password', () => {
    expect(signupSchema.safeParse(VALID).success).toBe(true);
  });

  describe('name', () => {
    it('rejects name shorter than 5 characters', () => {
      const result = signupSchema.safeParse({ ...VALID, name: 'Ali' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('name');
    });

    it('shows correct message for name shorter than 5 characters', () => {
      const result = signupSchema.safeParse({ ...VALID, name: 'Ali' });
      expect(result.error?.issues[0].message).toBe('Name must be at least 5 characters');
    });

    it('rejects name longer than 50 characters', () => {
      const result = signupSchema.safeParse({ ...VALID, name: 'A'.repeat(51) });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Name is too long');
    });
  });

  describe('email', () => {
    it('rejects invalid email', () => {
      const result = signupSchema.safeParse({ ...VALID, email: 'bad' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('email');
    });
  });

  describe('password', () => {
    it('rejects password shorter than 8 characters', () => {
      const result = signupSchema.safeParse({ ...VALID, password: 'Ab1!' });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Password must be at least 8 characters');
    });

    it('rejects password without uppercase letter', () => {
      const result = signupSchema.safeParse({ ...VALID, password: 'password1!' });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((i) => i.message)).toContain(
        'Must contain at least one uppercase letter',
      );
    });

    it('rejects password without lowercase letter', () => {
      const result = signupSchema.safeParse({ ...VALID, password: 'PASSWORD1!' });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((i) => i.message)).toContain(
        'Must contain at least one lowercase letter',
      );
    });

    it('rejects password without a number', () => {
      const result = signupSchema.safeParse({ ...VALID, password: 'Password!' });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((i) => i.message)).toContain(
        'Must contain at least one number',
      );
    });

    it('rejects password without a special character', () => {
      const result = signupSchema.safeParse({ ...VALID, password: 'Password1' });
      expect(result.success).toBe(false);
      expect(result.error?.issues.map((i) => i.message)).toContain(
        'Must contain at least one special character',
      );
    });

    it('reports all failing rules at once', () => {
      const result = signupSchema.safeParse({ ...VALID, password: 'alllower1' });
      expect(result.success).toBe(false);
      const messages = result.error?.issues.map((i) => i.message) ?? [];
      expect(messages).toContain('Must contain at least one uppercase letter');
      expect(messages).toContain('Must contain at least one special character');
    });
  });
});
