import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'
import { GET } from '@/app/api/health/route'

describe('Health API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/health', () => {
    it('should return healthy status when database is connected', async () => {
      ;(prisma.$queryRaw as any).mockResolvedValue([{ '?column?': 1 }])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.database).toBe('connected')
      expect(data.timestamp).toBeDefined()
      expect(prisma.$queryRaw).toHaveBeenCalled()
    })

    it('should return unhealthy status when database connection fails', async () => {
      ;(prisma.$queryRaw as any).mockRejectedValue(new Error('Connection refused'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.database).toBe('disconnected')
      expect(data.error).toBe('Connection refused')
    })

    it('should handle non-Error exceptions gracefully', async () => {
      ;(prisma.$queryRaw as any).mockRejectedValue('String error')

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
      expect(data.database).toBe('disconnected')
      expect(data.error).toBe('Unknown error')
    })
  })
})
