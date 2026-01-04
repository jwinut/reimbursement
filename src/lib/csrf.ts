import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'X-CSRF-Token'

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Validate CSRF token using double-submit cookie pattern
 * Compares the token from the cookie with the token from the header
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const headerToken = request.headers.get(CSRF_HEADER_NAME)

  // Both tokens must exist and match
  if (!cookieToken || !headerToken) {
    return false
  }

  // Use timing-safe comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) {
    return false
  }

  // Simple constant-time comparison
  let result = 0
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }

  return result === 0
}

/**
 * Set CSRF cookie on a response
 */
export function setCsrfCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })
  return response
}

/**
 * Get the CSRF token from a request's cookies
 */
export function getCsrfTokenFromRequest(request: NextRequest): string | undefined {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME }
