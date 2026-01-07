import { NextRequest } from 'next/server'

export interface MockRequestOptions {
  method?: string
  body?: object
  csrfToken?: string | null
  headers?: Record<string, string>
  searchParams?: Record<string, string>
}

export function createMockRequest(
  url: string,
  options: MockRequestOptions = {}
): NextRequest {
  const {
    method = 'GET',
    body,
    csrfToken = 'valid-csrf-token',
    headers = {},
    searchParams = {},
  } = options

  const urlObj = new URL(url, 'http://localhost:3000')
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value)
  })

  const requestHeaders = new Headers(headers)

  if (csrfToken !== null) {
    requestHeaders.set('X-CSRF-Token', csrfToken)
    requestHeaders.set('Cookie', `csrf-token=${csrfToken}`)
  }

  let bodyStr: BodyInit | null = null

  if (body && method !== 'GET') {
    requestHeaders.set('Content-Type', 'application/json')
    bodyStr = JSON.stringify(body)
  }

  return new NextRequest(urlObj.toString(), {
    method,
    headers: requestHeaders,
    body: bodyStr,
  })
}

export function createMockFormDataRequest(
  url: string,
  formData: FormData,
  options: Omit<MockRequestOptions, 'body'> = {}
): NextRequest {
  const { method = 'POST', csrfToken = 'valid-csrf-token', headers = {} } = options

  const requestHeaders = new Headers(headers)

  if (csrfToken !== null) {
    requestHeaders.set('X-CSRF-Token', csrfToken)
    requestHeaders.set('Cookie', `csrf-token=${csrfToken}`)
  }

  return new NextRequest(new URL(url, 'http://localhost:3000').toString(), {
    method,
    headers: requestHeaders,
    body: formData,
  })
}

export function createMockParams(
  params: Record<string, string>
): Promise<Record<string, string>> {
  return Promise.resolve(params)
}
