import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role } from '@prisma/client'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/permissions', () => ({
  isManager: vi.fn((role: Role) => role === Role.MANAGER),
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { GET } from '@/app/api/users/route'

describe('GET /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 for unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.message).toBe('Unauthorized')
  })

  it('should return 403 for non-manager users', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', role: Role.EMPLOYEE },
      expires: new Date().toISOString(),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Forbidden: Manager access required')
  })

  it('should return user list for managers', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        lineId: 'line-1',
        displayName: 'User One',
        pictureUrl: 'https://example.com/pic1.jpg',
        role: Role.EMPLOYEE,
        isApproved: true,
        createdAt: new Date('2024-01-01'),
      },
      {
        id: 'user-2',
        lineId: 'line-2',
        displayName: 'User Two',
        pictureUrl: null,
        role: Role.MANAGER,
        isApproved: true,
        createdAt: new Date('2024-01-02'),
      },
    ]

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.users).toHaveLength(2)
    expect(data.users[0].id).toBe('user-1')
    expect(data.users[0].displayName).toBe('User One')
    expect(data.users[0].role).toBe(Role.EMPLOYEE)
    expect(data.users[1].id).toBe('user-2')
    expect(data.users[1].displayName).toBe('User Two')
    expect(data.users[1].role).toBe(Role.MANAGER)
  })

  it('should return empty array when no users exist', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.users).toEqual([])
  })

  it('should query with correct select and orderBy parameters', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    await GET()

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        lineId: true,
        displayName: true,
        pictureUrl: true,
        role: true,
        isApproved: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  })
})
