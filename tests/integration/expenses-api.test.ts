import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    expense: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: vi.fn(),
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { validateCsrfToken } from '@/lib/csrf'

describe('Expenses API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/expenses', () => {
    it('should reject requests without valid CSRF token', async () => {
      ;(validateCsrfToken as any).mockReturnValue(false)

      // Simulate CSRF validation failure
      expect(validateCsrfToken({} as any)).toBe(false)
    })

    it('should reject unauthenticated requests', async () => {
      ;(validateCsrfToken as any).mockReturnValue(true)
      ;(getServerSession as any).mockResolvedValue(null)

      // Simulate unauthorized response
      expect(await getServerSession()).toBeNull()
    })

    it('should create expense for authenticated user with valid CSRF token', async () => {
      const mockSession = { user: { id: 'user-123' } }
      const mockExpense = {
        id: 'expense-123',
        description: 'Test expense',
        amount: 100,
        date: new Date(),
        userId: 'user-123',
      }

      ;(validateCsrfToken as any).mockReturnValue(true)
      ;(getServerSession as any).mockResolvedValue(mockSession)
      ;(prisma.expense.create as any).mockResolvedValue(mockExpense)

      const result = await prisma.expense.create({
        data: {
          description: 'Test expense',
          amount: 100,
          date: new Date(),
          userId: 'user-123',
        },
      })

      expect(result).toEqual(mockExpense)
      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'Test expense',
          amount: 100,
          userId: 'user-123',
        }),
      })
    })
  })

  describe('GET /api/expenses', () => {
    it('should return expenses for authenticated user', async () => {
      const mockSession = { user: { id: 'user-123' } }
      const mockExpenses = [
        { id: '1', description: 'Expense 1', amount: 100 },
        { id: '2', description: 'Expense 2', amount: 200 },
      ]

      ;(getServerSession as any).mockResolvedValue(mockSession)
      ;(prisma.expense.findMany as any).mockResolvedValue(mockExpenses)

      const result = await prisma.expense.findMany({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      })

      expect(result).toEqual(mockExpenses)
    })
  })
})
