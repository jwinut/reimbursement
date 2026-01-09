import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role } from '@prisma/client'
import { createMockRequest } from '../helpers/mock-api-request'

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
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  isManager: vi.fn((role: Role) => role === Role.MANAGER),
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { validateCsrfToken } from '@/lib/csrf'
import { POST } from '@/app/api/users/[id]/disable/route'

describe('POST /api/users/[id]/disable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 for unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = createMockRequest('/api/users/user-123/disable', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.message).toBe('Unauthorized')
  })

  it('should return 403 for non-manager users', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-456', role: Role.EMPLOYEE },
      expires: new Date().toISOString(),
    })

    const request = createMockRequest('/api/users/user-123/disable', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Forbidden: Manager access required')
  })

  it('should return 403 for invalid CSRF token', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(validateCsrfToken).mockReturnValue(false)

    const request = createMockRequest('/api/users/user-123/disable', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Invalid CSRF token')
  })

  it('should return 404 for non-existent user', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const request = createMockRequest('/api/users/non-existent/disable', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'non-existent' }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.message).toBe('User not found')
  })

  it('should return 400 when trying to disable own account', async () => {
    const mockUser = {
      id: 'manager-123',
      lineId: 'line-123',
      displayName: 'Test Manager',
      pictureUrl: null,
      role: Role.MANAGER,
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

    const request = createMockRequest('/api/users/manager-123/disable', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'manager-123' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe('Cannot disable your own account')
  })

  it('should successfully disable a user', async () => {
    const mockUser = {
      id: 'user-123',
      lineId: 'line-123',
      displayName: 'Test User',
      pictureUrl: null,
      role: Role.EMPLOYEE,
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const updatedUser = {
      id: 'user-123',
      displayName: 'Test User',
      isApproved: false,
    }

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any)

    const request = createMockRequest('/api/users/user-123/disable', {
      method: 'POST',
    })

    const response = await POST(request, { params: Promise.resolve({ id: 'user-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('User disabled successfully')
    expect(data.user).toEqual(updatedUser)
  })

  it('should call update with correct parameters', async () => {
    const mockUser = {
      id: 'user-123',
      lineId: 'line-123',
      displayName: 'Test User',
      pictureUrl: null,
      role: Role.EMPLOYEE,
      isApproved: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'user-123',
      displayName: 'Test User',
      isApproved: false,
    } as any)

    const request = createMockRequest('/api/users/user-123/disable', {
      method: 'POST',
    })

    await POST(request, { params: Promise.resolve({ id: 'user-123' }) })

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: { isApproved: false },
      select: {
        id: true,
        displayName: true,
        isApproved: true,
      },
    })
  })
})
