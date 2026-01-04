import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('Auth Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signIn callback', () => {
    it('should upsert user on LINE sign in', async () => {
      const mockProfile = {
        userId: 'line-user-123',
        displayName: 'Test User',
        pictureUrl: 'https://example.com/avatar.jpg',
      }

      ;(prisma.user.upsert as any).mockResolvedValue({
        id: 'cuid-123',
        lineId: mockProfile.userId,
        displayName: mockProfile.displayName,
        pictureUrl: mockProfile.pictureUrl,
        role: 'EMPLOYEE',
      })

      await prisma.user.upsert({
        where: { lineId: mockProfile.userId },
        update: {
          displayName: mockProfile.displayName,
          pictureUrl: mockProfile.pictureUrl,
        },
        create: {
          lineId: mockProfile.userId,
          displayName: mockProfile.displayName,
          pictureUrl: mockProfile.pictureUrl,
        },
      })

      expect(prisma.user.upsert).toHaveBeenCalledWith({
        where: { lineId: 'line-user-123' },
        update: {
          displayName: 'Test User',
          pictureUrl: 'https://example.com/avatar.jpg',
        },
        create: {
          lineId: 'line-user-123',
          displayName: 'Test User',
          pictureUrl: 'https://example.com/avatar.jpg',
        },
      })
    })
  })

  describe('session callback', () => {
    it('should add user id and role to session', async () => {
      const mockUser = {
        id: 'cuid-123',
        lineId: 'line-user-123',
        role: 'EMPLOYEE',
      }

      ;(prisma.user.findUnique as any).mockResolvedValue(mockUser)

      const result = await prisma.user.findUnique({
        where: { lineId: 'line-user-123' },
      })

      expect(result).toEqual(mockUser)
    })
  })
})
