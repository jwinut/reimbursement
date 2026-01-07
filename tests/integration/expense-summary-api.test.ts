import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role, ExpenseStatus } from '@prisma/client'

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
      count: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { GET } from '@/app/api/expenses/summary/route'

describe('GET /api/expenses/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 for unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.message).toBe('Unauthorized')
  })

  it('should return 403 for non-manager users', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', role: Role.EMPLOYEE },
      expires: new Date().toISOString(),
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Forbidden: Manager access required')
  })

  it('should return correct counts by status', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })

    // Mock counts
    vi.mocked(prisma.expense.count)
      .mockResolvedValueOnce(5)   // pending
      .mockResolvedValueOnce(10)  // approved
      .mockResolvedValueOnce(2)   // rejected
      .mockResolvedValueOnce(8)   // reimbursed

    // Mock aggregates
    vi.mocked(prisma.expense.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: 500 } })   // pending total
      .mockResolvedValueOnce({ _sum: { amount: 1000 } })  // approved total
      .mockResolvedValueOnce({ _sum: { amount: 800 } })   // reimbursed total

    vi.mocked(prisma.expense.findMany).mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.counts).toEqual({
      pending: 5,
      approved: 10,
      rejected: 2,
      reimbursed: 8,
      total: 25,
    })
  })

  it('should return correct totals (sum of amounts)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })

    vi.mocked(prisma.expense.count)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(4)

    vi.mocked(prisma.expense.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: 300 } })
      .mockResolvedValueOnce({ _sum: { amount: 500 } })
      .mockResolvedValueOnce({ _sum: { amount: 400 } })

    vi.mocked(prisma.expense.findMany).mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.totals).toEqual({
      pending: 300,
      approved: 500,
      reimbursed: 400,
    })
  })

  it('should return recentPending expenses (up to 5)', async () => {
    const mockPendingExpenses = [
      {
        id: 'expense-1',
        description: 'Expense 1',
        amount: 100,
        status: ExpenseStatus.PENDING,
        user: { id: 'user-1', displayName: 'User 1', pictureUrl: null },
      },
      {
        id: 'expense-2',
        description: 'Expense 2',
        amount: 200,
        status: ExpenseStatus.PENDING,
        user: { id: 'user-2', displayName: 'User 2', pictureUrl: null },
      },
    ]

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })

    vi.mocked(prisma.expense.count).mockResolvedValue(0)
    vi.mocked(prisma.expense.aggregate).mockResolvedValue({ _sum: { amount: null } })
    vi.mocked(prisma.expense.findMany).mockResolvedValue(mockPendingExpenses)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recentPending).toHaveLength(2)
    expect(data.recentPending[0].id).toBe('expense-1')
    expect(data.recentPending[0].user.displayName).toBe('User 1')
  })

  it('should return zero totals when no expenses exist', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })

    vi.mocked(prisma.expense.count).mockResolvedValue(0)
    vi.mocked(prisma.expense.aggregate).mockResolvedValue({ _sum: { amount: null } })
    vi.mocked(prisma.expense.findMany).mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.counts.total).toBe(0)
    expect(data.totals.pending).toBe(0)
    expect(data.totals.approved).toBe(0)
    expect(data.totals.reimbursed).toBe(0)
    expect(data.recentPending).toEqual([])
  })

  it('should include user info in recentPending', async () => {
    const mockPendingExpense = {
      id: 'expense-1',
      description: 'Test expense',
      amount: 100,
      status: ExpenseStatus.PENDING,
      date: new Date(),
      createdAt: new Date(),
      user: {
        id: 'user-123',
        displayName: 'Test User',
        pictureUrl: 'https://example.com/avatar.jpg',
      },
    }

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })

    vi.mocked(prisma.expense.count).mockResolvedValue(1)
    vi.mocked(prisma.expense.aggregate).mockResolvedValue({ _sum: { amount: 100 } })
    vi.mocked(prisma.expense.findMany).mockResolvedValue([mockPendingExpense])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recentPending[0].user).toEqual({
      id: 'user-123',
      displayName: 'Test User',
      pictureUrl: 'https://example.com/avatar.jpg',
    })
  })
})
