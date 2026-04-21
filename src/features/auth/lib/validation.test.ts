import { describe, it, expect } from 'vitest'

import { loginSchema, signupSchema } from './validation'

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: 'secret' })
    expect(result.success).toBe(true)
  })

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('password')
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })
})

describe('signupSchema', () => {
  it('accepts valid name, email, and password', () => {
    const result = signupSchema.safeParse({
      name: 'Alice',
      email: 'a@b.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects name shorter than 2 characters', () => {
    const result = signupSchema.safeParse({ name: 'A', email: 'a@b.com', password: 'password123' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('name')
  })

  it('shows custom message for name shorter than 2 characters', () => {
    const result = signupSchema.safeParse({ name: 'A', email: 'a@b.com', password: 'password123' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Name must be at least 2 characters')
  })

  it('shows custom message for name longer than 50 characters', () => {
    const result = signupSchema.safeParse({
      name: 'A'.repeat(51),
      email: 'a@b.com',
      password: 'password123',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Name is too long')
  })

  it('rejects password shorter than 8 characters', () => {
    const result = signupSchema.safeParse({ name: 'Alice', email: 'a@b.com', password: 'short' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('password')
  })

  it('rejects invalid email', () => {
    const result = signupSchema.safeParse({ name: 'Alice', email: 'bad', password: 'password123' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })
})
