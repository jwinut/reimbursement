import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { SummaryTriggerType } from '@prisma/client'

// Mock the summary service
vi.mock('@/lib/summary-service', () => ({
  generateAllPendingSummaries: vi.fn(),
}))

import { generateAllPendingSummaries } from '@/lib/summary-service'
import { POST } from '@/app/api/cron/summaries/route'

function createCronRequest(authHeader?: string): NextRequest {
  const headers = new Headers()
  if (authHeader) {
    headers.set('Authorization', authHeader)
  }

  return new NextRequest('http://localhost:3000/api/cron/summaries', {
    method: 'POST',
    headers,
  })
}

describe('Cron Summaries API Endpoint', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables before each test
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv
  })

  describe('POST /api/cron/summaries', () => {
    describe('Authentication', () => {
      it('should return 500 when CRON_SECRET is not configured', async () => {
        delete process.env.CRON_SECRET

        const request = createCronRequest('Bearer some-token')
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.message).toBe('Server configuration error')
        expect(generateAllPendingSummaries).not.toHaveBeenCalled()
      })

      it('should return 401 when Authorization header is missing', async () => {
        process.env.CRON_SECRET = 'valid-cron-secret'

        const request = createCronRequest()
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.message).toBe('Unauthorized')
        expect(generateAllPendingSummaries).not.toHaveBeenCalled()
      })

      it('should return 401 when CRON_SECRET is invalid', async () => {
        process.env.CRON_SECRET = 'valid-cron-secret'

        const request = createCronRequest('Bearer invalid-secret')
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.message).toBe('Unauthorized')
        expect(generateAllPendingSummaries).not.toHaveBeenCalled()
      })

      it('should return 401 when Authorization header format is incorrect', async () => {
        process.env.CRON_SECRET = 'valid-cron-secret'

        // Missing "Bearer " prefix
        const request = createCronRequest('valid-cron-secret')
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(401)
        expect(data.message).toBe('Unauthorized')
        expect(generateAllPendingSummaries).not.toHaveBeenCalled()
      })
    })

    describe('Summary Generation', () => {
      it('should return 200 with summaries when valid CRON_SECRET is provided', async () => {
        process.env.CRON_SECRET = 'valid-cron-secret'

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
            triggerType: SummaryTriggerType.SCHEDULED,
            createdAt: '2024-01-05T12:00:00.000Z',
          },
          {
            id: 'summary-2',
            userId: 'user-2',
            userName: 'User Two',
            userPictureUrl: 'https://example.com/avatar.jpg',
            startDate: '2024-01-01T00:00:00.000Z',
            endDate: '2024-01-05T00:00:00.000Z',
            totalAmount: '300',
            expenseCount: 2,
            expenses: [],
            triggerType: SummaryTriggerType.SCHEDULED,
            createdAt: '2024-01-05T12:00:00.000Z',
          },
        ]

        vi.mocked(generateAllPendingSummaries).mockResolvedValue(mockSummaries)

        const request = createCronRequest('Bearer valid-cron-secret')
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Summaries generated successfully')
        expect(data.count).toBe(2)
        expect(data.summaries).toHaveLength(2)
        expect(data.summaries[0].id).toBe('summary-1')
        expect(data.summaries[1].id).toBe('summary-2')
        expect(generateAllPendingSummaries).toHaveBeenCalledWith(
          SummaryTriggerType.SCHEDULED
        )
      })

      it('should handle no pending expenses gracefully', async () => {
        process.env.CRON_SECRET = 'valid-cron-secret'

        vi.mocked(generateAllPendingSummaries).mockResolvedValue([])

        const request = createCronRequest('Bearer valid-cron-secret')
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe('Summaries generated successfully')
        expect(data.count).toBe(0)
        expect(data.summaries).toEqual([])
        expect(generateAllPendingSummaries).toHaveBeenCalledWith(
          SummaryTriggerType.SCHEDULED
        )
      })

      it('should use SCHEDULED trigger type for cron invocations', async () => {
        process.env.CRON_SECRET = 'valid-cron-secret'

        vi.mocked(generateAllPendingSummaries).mockResolvedValue([])

        const request = createCronRequest('Bearer valid-cron-secret')
        await POST(request)

        expect(generateAllPendingSummaries).toHaveBeenCalledTimes(1)
        expect(generateAllPendingSummaries).toHaveBeenCalledWith(
          SummaryTriggerType.SCHEDULED
        )
      })
    })

    describe('Error Handling', () => {
      it('should return 500 when summary generation throws an error', async () => {
        process.env.CRON_SECRET = 'valid-cron-secret'

        vi.mocked(generateAllPendingSummaries).mockRejectedValue(
          new Error('Database connection failed')
        )

        const request = createCronRequest('Bearer valid-cron-secret')
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.message).toBe('Internal server error')
      })

      it('should handle non-Error exceptions gracefully', async () => {
        process.env.CRON_SECRET = 'valid-cron-secret'

        vi.mocked(generateAllPendingSummaries).mockRejectedValue('String error')

        const request = createCronRequest('Bearer valid-cron-secret')
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.message).toBe('Internal server error')
      })
    })
  })
})
