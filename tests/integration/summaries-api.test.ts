import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role, SummaryTriggerType } from '@prisma/client'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: vi.fn(),
}))

vi.mock('@/lib/summary-service', () => ({
  getAllSummaries: vi.fn(),
  generateUserSummary: vi.fn(),
  generateAllPendingSummaries: vi.fn(),
}))

import { getServerSession } from 'next-auth'
import { validateCsrfToken } from '@/lib/csrf'
import {
  getAllSummaries,
  generateUserSummary,
  generateAllPendingSummaries,
} from '@/lib/summary-service'
import { GET, POST } from '@/app/api/summaries/route'

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const searchParams = new URLSearchParams(params)
  return new NextRequest(
    `http://localhost:3000/api/summaries?${searchParams.toString()}`,
    { method: 'GET' }
  )
}

function createPostRequest(
  body: Record<string, unknown> = {},
  csrfToken = 'valid-token'
): NextRequest {
  const headers = new Headers()
  headers.set('X-CSRF-Token', csrfToken)
  headers.set('Cookie', `csrf-token=${csrfToken}`)
  headers.set('Content-Type', 'application/json')

  return new NextRequest('http://localhost:3000/api/summaries', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('GET /api/summaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 for unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = createGetRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.message).toBe('Unauthorized')
  })

  it('should return 403 for non-manager users', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', role: Role.EMPLOYEE },
      expires: new Date().toISOString(),
    })

    const request = createGetRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Forbidden: Manager access required')
  })

  it('should return summaries with pagination for managers', async () => {
    const mockSummaries = [
      {
        id: 'summary-1',
        userId: 'user-1',
        userName: 'User One',
        userPictureUrl: null,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-05T00:00:00.000Z',
        totalAmount: '500',
        expenseCount: 3,
        expenses: [],
        triggerType: SummaryTriggerType.MANUAL,
        createdAt: '2024-01-05T12:00:00.000Z',
      },
    ]

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(getAllSummaries).mockResolvedValue({
      summaries: mockSummaries,
      total: 1,
    })

    const request = createGetRequest({ page: '1', limit: '10' })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.summaries).toHaveLength(1)
    expect(data.pagination.total).toBe(1)
    expect(data.pagination.page).toBe(1)
    expect(data.pagination.limit).toBe(10)
  })

  it('should use default pagination values', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(getAllSummaries).mockResolvedValue({
      summaries: [],
      total: 0,
    })

    const request = createGetRequest()
    await GET(request)

    expect(getAllSummaries).toHaveBeenCalledWith({
      limit: 20,
      offset: 0,
    })
  })

  it('should calculate correct offset for pagination', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(getAllSummaries).mockResolvedValue({
      summaries: [],
      total: 0,
    })

    const request = createGetRequest({ page: '3', limit: '10' })
    await GET(request)

    expect(getAllSummaries).toHaveBeenCalledWith({
      limit: 10,
      offset: 20, // (3-1) * 10
    })
  })
})

describe('POST /api/summaries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 403 for invalid CSRF token', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(false)

    const request = createPostRequest({ triggerType: 'MANUAL' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Invalid CSRF token')
  })

  it('should return 401 for unauthenticated requests', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = createPostRequest({ triggerType: 'MANUAL' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.message).toBe('Unauthorized')
  })

  it('should return 403 for non-manager users', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', role: Role.EMPLOYEE },
      expires: new Date().toISOString(),
    })

    const request = createPostRequest({ triggerType: 'MANUAL' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Forbidden: Manager access required')
  })

  it('should return 400 for invalid triggerType', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })

    const request = createPostRequest({ triggerType: 'INVALID' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe('Invalid request body')
  })

  it('should generate summary for specific user', async () => {
    const mockSummary = {
      id: 'summary-1',
      userId: 'user-1',
      userName: 'User One',
      userPictureUrl: null,
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-05T00:00:00.000Z',
      totalAmount: '500',
      expenseCount: 3,
      expenses: [],
      triggerType: SummaryTriggerType.MANUAL,
      createdAt: '2024-01-05T12:00:00.000Z',
    }

    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(generateUserSummary).mockResolvedValue(mockSummary)

    const request = createPostRequest({
      triggerType: 'MANUAL',
      userId: 'user-1',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('summary-1')
    expect(generateUserSummary).toHaveBeenCalledWith({
      userId: 'user-1',
      triggerType: SummaryTriggerType.MANUAL,
    })
  })

  it('should return 404 when no pending expenses for specific user', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(generateUserSummary).mockResolvedValue(null)

    const request = createPostRequest({
      triggerType: 'MANUAL',
      userId: 'user-1',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.message).toContain('No pending expenses')
  })

  it('should generate summaries for all users when no userId provided', async () => {
    const mockSummaries = [
      {
        id: 'summary-1',
        userId: 'user-1',
        userName: 'User One',
        userPictureUrl: null,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-05T00:00:00.000Z',
        totalAmount: '500',
        expenseCount: 3,
        expenses: [],
        triggerType: SummaryTriggerType.MANUAL,
        createdAt: '2024-01-05T12:00:00.000Z',
      },
      {
        id: 'summary-2',
        userId: 'user-2',
        userName: 'User Two',
        userPictureUrl: null,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-05T00:00:00.000Z',
        totalAmount: '300',
        expenseCount: 2,
        expenses: [],
        triggerType: SummaryTriggerType.MANUAL,
        createdAt: '2024-01-05T12:00:00.000Z',
      },
    ]

    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(generateAllPendingSummaries).mockResolvedValue(mockSummaries)

    const request = createPostRequest({ triggerType: 'MANUAL' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.summaries).toHaveLength(2)
    expect(data.message).toContain('Generated 2 summaries')
    expect(generateAllPendingSummaries).toHaveBeenCalledWith(
      SummaryTriggerType.MANUAL
    )
  })

  it('should return 200 with empty array when no users have pending expenses', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(generateAllPendingSummaries).mockResolvedValue([])

    const request = createPostRequest({ triggerType: 'MANUAL' })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.summaries).toEqual([])
    expect(data.message).toContain('No users with pending expenses')
  })
})
