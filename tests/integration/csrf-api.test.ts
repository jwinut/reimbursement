import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the csrf module
vi.mock('@/lib/csrf', () => ({
  generateCsrfToken: vi.fn(() => 'mock-csrf-token-12345'),
  setCsrfCookie: vi.fn(),
  getCsrfTokenFromRequest: vi.fn(),
}))

import { generateCsrfToken, setCsrfCookie, getCsrfTokenFromRequest } from '@/lib/csrf'
import { GET } from '@/app/api/csrf/route'

describe('CSRF API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/csrf', () => {
    it('should return existing token from cookie if present', async () => {
      const existingToken = 'existing-csrf-token'
      ;(getCsrfTokenFromRequest as any).mockReturnValue(existingToken)

      const request = new NextRequest('http://localhost:3000/api/csrf')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.csrfToken).toBe(existingToken)
      expect(generateCsrfToken).not.toHaveBeenCalled()
      expect(setCsrfCookie).toHaveBeenCalledWith(expect.anything(), existingToken)
    })

    it('should generate new token if none exists in cookie', async () => {
      ;(getCsrfTokenFromRequest as any).mockReturnValue(null)

      const request = new NextRequest('http://localhost:3000/api/csrf')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.csrfToken).toBe('mock-csrf-token-12345')
      expect(generateCsrfToken).toHaveBeenCalled()
      expect(setCsrfCookie).toHaveBeenCalledWith(expect.anything(), 'mock-csrf-token-12345')
    })

    it('should always set/refresh the cookie', async () => {
      ;(getCsrfTokenFromRequest as any).mockReturnValue('token')

      const request = new NextRequest('http://localhost:3000/api/csrf')
      await GET(request)

      expect(setCsrfCookie).toHaveBeenCalled()
    })

    it('should return JSON content type', async () => {
      ;(getCsrfTokenFromRequest as any).mockReturnValue(null)

      const request = new NextRequest('http://localhost:3000/api/csrf')
      const response = await GET(request)

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })
})
