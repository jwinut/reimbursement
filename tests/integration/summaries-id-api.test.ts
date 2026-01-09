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

vi.mock('@/lib/summary-service', () => ({
  getSummaryById: vi.fn(),
}))

import { getServerSession } from 'next-auth'
import { getSummaryById } from '@/lib/summary-service'
import { GET } from '@/app/api/summaries/[id]/route'

function createRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/summaries/${id}`, {
    method: 'GET',
  })
}

function createParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id })
}

describe('GET /api/summaries/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 for unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = createRequest('summary-123')
    const response = await GET(request, { params: createParams('summary-123') })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.message).toBe('Unauthorized')
  })

  it('should return 403 for non-manager users', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', role: Role.EMPLOYEE },
      expires: new Date().toISOString(),
    })

    const request = createRequest('summary-123')
    const response = await GET(request, { params: createParams('summary-123') })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Forbidden: Manager access required')
  })

  it('should return 404 for non-existent summary', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(getSummaryById).mockResolvedValue(null)

    const request = createRequest('non-existent')
    const response = await GET(request, { params: createParams('non-existent') })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.message).toBe('Summary not found')
  })

  it('should return summary for managers', async () => {
    const mockSummary = {
      id: 'summary-123',
      userId: 'user-1',
      userName: 'Test User',
      userPictureUrl: 'https://example.com/avatar.jpg',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-05T00:00:00.000Z',
      totalAmount: '1500.50',
      expenseCount: 5,
      expenses: [
        {
          id: 'expense-1',
          description: 'Lunch',
          amount: 300,
          date: '2024-01-02T00:00:00.000Z',
          status: 'PENDING',
        },
        {
          id: 'expense-2',
          description: 'Transportation',
          amount: 1200.5,
          date: '2024-01-03T00:00:00.000Z',
          status: 'PENDING',
        },
      ],
      triggerType: SummaryTriggerType.MANUAL,
      createdAt: '2024-01-05T12:00:00.000Z',
    }

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(getSummaryById).mockResolvedValue(mockSummary)

    const request = createRequest('summary-123')
    const response = await GET(request, { params: createParams('summary-123') })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('summary-123')
    expect(data.userName).toBe('Test User')
    expect(data.totalAmount).toBe('1500.50')
    expect(data.expenseCount).toBe(5)
    expect(data.expenses).toHaveLength(2)
  })

  it('should call getSummaryById with correct id', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(getSummaryById).mockResolvedValue(null)

    const request = createRequest('test-summary-id')
    await GET(request, { params: createParams('test-summary-id') })

    expect(getSummaryById).toHaveBeenCalledWith('test-summary-id')
  })
})
