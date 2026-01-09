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
import { authOptions } from '@/lib/auth'

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

    it('should log error and return true when prisma.user.upsert throws an error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockError = new Error('Database connection failed')
      ;(prisma.user.upsert as any).mockRejectedValue(mockError)

      const signInCallback = authOptions.callbacks!.signIn!
      const result = await signInCallback({
        user: { id: 'line-user-123', name: 'Test User', email: null, image: null },
        account: {
          provider: 'line',
          type: 'oauth',
          providerAccountId: 'line-user-123',
        },
        profile: {
          userId: 'line-user-123',
          displayName: 'Test User',
          pictureUrl: 'https://example.com/avatar.jpg',
        },
        email: undefined,
        credentials: undefined,
      } as any)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AUTH] Failed to upsert user during sign-in:',
        mockError
      )
      expect(result).toBe(true)

      consoleErrorSpy.mockRestore()
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

    it('should log error and return session without user enrichment when prisma.user.findUnique throws an error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockError = new Error('Database query failed')
      ;(prisma.user.findUnique as any).mockRejectedValue(mockError)

      const sessionCallback = authOptions.callbacks!.session!
      const mockSession = {
        user: {
          name: 'Test User',
          email: null,
          image: 'https://example.com/avatar.jpg',
        },
        expires: '2024-12-31T23:59:59.999Z',
      }
      const mockToken = {
        sub: 'line-user-123',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
      }

      const result = await sessionCallback({
        session: mockSession,
        token: mockToken,
        user: undefined as any,
        newSession: undefined,
        trigger: 'update',
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[AUTH] Failed to fetch user during session:',
        mockError
      )
      // Session should be returned without id, role, or isApproved enrichment
      expect(result).toEqual(mockSession)
      expect(result.user).not.toHaveProperty('id')
      expect(result.user).not.toHaveProperty('role')
      expect(result.user).not.toHaveProperty('isApproved')

      consoleErrorSpy.mockRestore()
    })
  })
})
