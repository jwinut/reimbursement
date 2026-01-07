import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    expense: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: vi.fn(),
}))

vi.mock('fs/promises', () => ({
  default: {},
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  readFile: vi.fn(),
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { validateCsrfToken } from '@/lib/csrf'
import { POST, GET } from '@/app/api/expenses/route'

// Helper to create FormData request
function createFormDataRequest(data: Record<string, string | Blob>, csrfToken = 'valid-token'): NextRequest {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value)
  })

  const headers = new Headers()
  headers.set('X-CSRF-Token', csrfToken)
  headers.set('Cookie', `csrf-token=${csrfToken}`)

  return new NextRequest('http://localhost:3000/api/expenses', {
    method: 'POST',
    body: formData,
    headers,
  })
}

describe('Expenses API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/expenses', () => {
    it('should return 403 for invalid CSRF token', async () => {
      ;(validateCsrfToken as any).mockReturnValue(false)

      const request = createFormDataRequest({
        description: 'Test',
        amount: '100',
        date: '2024-01-01',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.message).toBe('Invalid CSRF token')
    })

    it('should return 401 for unauthenticated requests', async () => {
      ;(validateCsrfToken as any).mockReturnValue(true)
      ;(getServerSession as any).mockResolvedValue(null)

      const request = createFormDataRequest({
        description: 'Test',
        amount: '100',
        date: '2024-01-01',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.message).toBe('Unauthorized')
    })

    it('should return 400 for missing required fields', async () => {
      ;(validateCsrfToken as any).mockReturnValue(true)
      ;(getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } })

      const request = createFormDataRequest({
        description: 'Test',
        // missing amount and date
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('Missing required fields')
    })

    it('should return 400 for invalid amount (negative)', async () => {
      ;(validateCsrfToken as any).mockReturnValue(true)
      ;(getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } })

      const request = createFormDataRequest({
        description: 'Test',
        amount: '-100',
        date: '2024-01-01',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('Invalid amount')
    })

    it('should return 400 for invalid amount (zero)', async () => {
      ;(validateCsrfToken as any).mockReturnValue(true)
      ;(getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } })

      const request = createFormDataRequest({
        description: 'Test',
        amount: '0',
        date: '2024-01-01',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('Invalid amount')
    })

    it('should return 400 for future date', async () => {
      ;(validateCsrfToken as any).mockReturnValue(true)
      ;(getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } })

      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const request = createFormDataRequest({
        description: 'Test',
        amount: '100',
        date: futureDate.toISOString().split('T')[0]!,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('Invalid date')
    })

    it('should create expense for valid request', async () => {
      const mockExpense = {
        id: 'expense-123',
        description: 'Test expense',
        amount: 100,
        date: new Date('2024-01-01'),
        userId: 'user-123',
      }

      ;(validateCsrfToken as any).mockReturnValue(true)
      ;(getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } })
      ;(prisma.expense.create as any).mockResolvedValue(mockExpense)

      const request = createFormDataRequest({
        description: 'Test expense',
        amount: '100',
        date: '2024-01-01',
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'Test expense',
          amount: 100,
          userId: 'user-123',
        }),
      })
    })

    it('should sanitize description by removing HTML tags', async () => {
      const mockExpense = { id: 'expense-123' }

      ;(validateCsrfToken as any).mockReturnValue(true)
      ;(getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } })
      ;(prisma.expense.create as any).mockResolvedValue(mockExpense)

      const request = createFormDataRequest({
        description: '<script>alert("xss")</script>Test',
        amount: '100',
        date: '2024-01-01',
      })

      await POST(request)

      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'scriptalert("xss")/scriptTest',
        }),
      })
    })

    it('should trim whitespace from description', async () => {
      const mockExpense = { id: 'expense-123' }

      ;(validateCsrfToken as any).mockReturnValue(true)
      ;(getServerSession as any).mockResolvedValue({ user: { id: 'user-123' } })
      ;(prisma.expense.create as any).mockResolvedValue(mockExpense)

      const request = createFormDataRequest({
        description: '   Test expense   ',
        amount: '100',
        date: '2024-01-01',
      })

      await POST(request)

      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'Test expense',
        }),
      })
    })
  })

  describe('GET /api/expenses', () => {
    it('should return 401 for unauthenticated requests', async () => {
      ;(getServerSession as any).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/expenses')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.message).toBe('Unauthorized')
    })

    it('should return expenses for authenticated user', async () => {
      const mockExpenses = [
        { id: '1', description: 'Expense 1', amount: 100, paidAmount: null },
        { id: '2', description: 'Expense 2', amount: 200, paidAmount: null },
      ]

      ;(getServerSession as any).mockResolvedValue({ user: { id: 'user-123', role: 'EMPLOYEE' } })
      ;(prisma.expense.findMany as any).mockResolvedValue(mockExpenses)
      ;(prisma.expense.count as any).mockResolvedValue(2)

      const request = new NextRequest('http://localhost:3000/api/expenses')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.expenses).toEqual(mockExpenses)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      })
    })

    it('should return empty array if no expenses', async () => {
      ;(getServerSession as any).mockResolvedValue({ user: { id: 'user-123', role: 'EMPLOYEE' } })
      ;(prisma.expense.findMany as any).mockResolvedValue([])
      ;(prisma.expense.count as any).mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/expenses')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.expenses).toEqual([])
      expect(data.pagination.total).toBe(0)
    })
  })
})
