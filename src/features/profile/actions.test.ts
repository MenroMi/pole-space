import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/lib/prisma', () => ({
  prisma: {
    userProgress: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/shared/lib/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

import { getUserProgressAction, updateProgressAction } from './actions'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockFindMany = prisma.userProgress.findMany as ReturnType<typeof vi.fn>
const mockUpsert = prisma.userProgress.upsert as ReturnType<typeof vi.fn>

const session = { user: { id: 'user-123' } }

beforeEach(() => vi.clearAllMocks())

describe('getUserProgressAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(getUserProgressAction()).rejects.toThrow('Unauthorized')
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('returns progress for the authenticated user', async () => {
    mockAuth.mockResolvedValue(session)
    mockFindMany.mockResolvedValue([{ id: 'progress-1' }])
    const result = await getUserProgressAction()
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-123' } }),
    )
    expect(result).toEqual([{ id: 'progress-1' }])
  })
})

describe('updateProgressAction', () => {
  it('throws Unauthorized when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    await expect(updateProgressAction('move-1', 'IN_PROGRESS')).rejects.toThrow('Unauthorized')
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('upserts progress using session userId', async () => {
    mockAuth.mockResolvedValue(session)
    mockUpsert.mockResolvedValue({ id: 'progress-1' })
    const result = await updateProgressAction('move-1', 'IN_PROGRESS')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_moveId: { userId: 'user-123', moveId: 'move-1' } },
        create: expect.objectContaining({
          userId: 'user-123',
          moveId: 'move-1',
          status: 'IN_PROGRESS',
        }),
      }),
    )
    expect(result).toEqual({ id: 'progress-1' })
  })
})
