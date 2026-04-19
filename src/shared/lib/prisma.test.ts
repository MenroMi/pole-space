import { describe, it, expect } from 'vitest'

describe('prisma singleton', () => {
  it('exports a prisma instance', async () => {
    const { prisma } = await import('./prisma')
    expect(prisma).toBeDefined()
  })

  it('returns the same instance on repeated imports', async () => {
    const { prisma: a } = await import('./prisma')
    const { prisma: b } = await import('./prisma')
    expect(a).toBe(b)
  })
})
