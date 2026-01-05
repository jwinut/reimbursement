import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Note: fs/promises mocking is challenging with vitest + Next.js
// These tests focus on the security validation logic

describe('Uploads API Endpoint', () => {
  describe('GET /api/uploads/[filename] - Security Validation', () => {
    // Dynamic import to allow mocking
    let GET: typeof import('@/app/api/uploads/[filename]/route').GET

    beforeEach(async () => {
      vi.resetModules()
      // Re-import for each test
      const mod = await import('@/app/api/uploads/[filename]/route')
      GET = mod.GET
    })

    it('should reject path traversal attempts with ..', async () => {
      const request = new NextRequest('http://localhost:3000/api/uploads/../etc/passwd')
      const response = await GET(request, { params: { filename: '../etc/passwd' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('Invalid filename')
    })

    it('should reject path traversal attempts with forward slash', async () => {
      const request = new NextRequest('http://localhost:3000/api/uploads/path/to/file')
      const response = await GET(request, { params: { filename: 'path/to/file' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('Invalid filename')
    })

    it('should reject multiple path traversal attempts', async () => {
      const request = new NextRequest('http://localhost:3000/api/uploads/../../etc/passwd')
      const response = await GET(request, { params: { filename: '../../etc/passwd' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('Invalid filename')
    })

    it('should reject hidden directory traversal', async () => {
      const request = new NextRequest('http://localhost:3000/api/uploads/..hidden/file')
      const response = await GET(request, { params: { filename: '..hidden/file' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('Invalid filename')
    })

    it('should return 404 for non-existent valid filename', async () => {
      const request = new NextRequest('http://localhost:3000/api/uploads/nonexistent-file.jpg')
      const response = await GET(request, { params: { filename: 'nonexistent-file.jpg' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.message).toBe('File not found')
    })

    it('should accept valid filename format with uuid', async () => {
      // This will return 404 since file doesn't exist, but proves validation passes
      const request = new NextRequest('http://localhost:3000/api/uploads/550e8400-e29b-41d4-a716-446655440000.jpg')
      const response = await GET(request, { params: { filename: '550e8400-e29b-41d4-a716-446655440000.jpg' } })
      const data = await response.json()

      // File doesn't exist, but validation passed (404, not 400)
      expect(response.status).toBe(404)
      expect(data.message).toBe('File not found')
    })
  })
})
