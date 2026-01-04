import { NextRequest, NextResponse } from 'next/server'
import {
  generateCsrfToken,
  setCsrfCookie,
  getCsrfTokenFromRequest,
} from '@/lib/csrf'

/**
 * GET /api/csrf
 * Returns a CSRF token. If one exists in cookies, returns that.
 * Otherwise generates a new one and sets it as a cookie.
 */
export async function GET(request: NextRequest) {
  let token = getCsrfTokenFromRequest(request)

  // If no token exists, generate a new one
  if (!token) {
    token = generateCsrfToken()
  }

  const response = NextResponse.json({ csrfToken: token })

  // Always set/refresh the cookie
  setCsrfCookie(response, token)

  return response
}
