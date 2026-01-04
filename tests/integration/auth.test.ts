import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const handlers = [
  http.get('https://api.line.me/v2/profile', () => {
    return HttpResponse.json({
      userId: 'line-test-user',
      displayName: 'Test User',
      pictureUrl: 'https://example.com/avatar.jpg',
    })
  }),
  http.post('https://api.line.me/oauth2/v2.1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
    })
  }),
]

const server = setupServer(...handlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('LINE OAuth Integration', () => {
  it('should fetch user profile from LINE API', async () => {
    const response = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: 'Bearer mock-token' },
    })
    const profile = await response.json()

    expect(profile.userId).toBe('line-test-user')
    expect(profile.displayName).toBe('Test User')
  })

  it('should exchange code for token', async () => {
    const response = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'mock-code',
      }),
    })
    const token = await response.json()

    expect(token.access_token).toBe('mock-access-token')
  })
})
