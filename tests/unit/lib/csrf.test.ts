import { describe, it, expect } from 'vitest'
import {
  generateCsrfToken,
  validateCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '@/lib/csrf'
import { NextRequest } from 'next/server'

describe('CSRF Protection', () => {
  describe('generateCsrfToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = generateCsrfToken()
      expect(token).toHaveLength(64)
      expect(/^[a-f0-9]+$/.test(token)).toBe(true)
    })

    it('should generate unique tokens on each call', () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('validateCsrfToken', () => {
    function createMockRequest(
      cookieToken: string | null,
      headerToken: string | null
    ): NextRequest {
      const headers = new Headers()
      if (headerToken) {
        headers.set(CSRF_HEADER_NAME, headerToken)
      }

      const url = 'http://localhost:3000/api/expenses'
      const request = new NextRequest(url, { headers })

      // Mock the cookies
      if (cookieToken) {
        // We need to add the cookie to the request
        const cookieHeader = `${CSRF_COOKIE_NAME}=${cookieToken}`
        const headersWithCookie = new Headers(headers)
        headersWithCookie.set('cookie', cookieHeader)
        return new NextRequest(url, { headers: headersWithCookie })
      }

      return request
    }

    it('should return true when cookie and header tokens match', () => {
      const token = generateCsrfToken()
      const request = createMockRequest(token, token)
      expect(validateCsrfToken(request)).toBe(true)
    })

    it('should return false when cookie token is missing', () => {
      const token = generateCsrfToken()
      const request = createMockRequest(null, token)
      expect(validateCsrfToken(request)).toBe(false)
    })

    it('should return false when header token is missing', () => {
      const token = generateCsrfToken()
      const request = createMockRequest(token, null)
      expect(validateCsrfToken(request)).toBe(false)
    })

    it('should return false when tokens do not match', () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()
      const request = createMockRequest(token1, token2)
      expect(validateCsrfToken(request)).toBe(false)
    })

    it('should return false when both tokens are missing', () => {
      const request = createMockRequest(null, null)
      expect(validateCsrfToken(request)).toBe(false)
    })

    it('should return false for tokens of different lengths', () => {
      const token = generateCsrfToken()
      const shortToken = token.slice(0, 32)
      const request = createMockRequest(token, shortToken)
      expect(validateCsrfToken(request)).toBe(false)
    })
  })

  describe('Constants', () => {
    it('should export the correct cookie name', () => {
      expect(CSRF_COOKIE_NAME).toBe('csrf-token')
    })

    it('should export the correct header name', () => {
      expect(CSRF_HEADER_NAME).toBe('X-CSRF-Token')
    })
  })
})
