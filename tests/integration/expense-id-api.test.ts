import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role, ExpenseStatus, Prisma } from '@prisma/client'

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
      findUnique: vi.fn(),
    },
  },
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { GET } from '@/app/api/expenses/[id]/route'
import { NextRequest } from 'next/server'

function createRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/expenses/${id}`)
}

function createParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id })
}

describe('GET /api/expenses/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 for unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = createRequest('expense-123')
    const response = await GET(request, { params: createParams('expense-123') })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.message).toBe('Unauthorized')
  })

  it('should return 404 for non-existent expense', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', role: Role.EMPLOYEE },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(null)

    const request = createRequest('non-existent')
    const response = await GET(request, { params: createParams('non-existent') })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.message).toBe('Expense not found')
  })

  it('should return expense for owner', async () => {
    const mockExpense = {
      id: 'expense-123',
      description: 'Test expense',
      amount: 100,
      date: new Date('2024-01-15'),
      imageUrl: null,
      status: ExpenseStatus.PENDING,
      userId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      approverId: null,
      approvalDate: null,
      rejectionReason: null,
      paidDate: null,
      paidAmount: null,
      user: { id: 'user-123', displayName: 'Test User', pictureUrl: null },
      approver: null,
    }

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', role: Role.EMPLOYEE },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense)

    const request = createRequest('expense-123')
    const response = await GET(request, { params: createParams('expense-123') })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('expense-123')
    expect(data.description).toBe('Test expense')
  })

  it('should return expense for manager viewing any expense', async () => {
    const mockExpense = {
      id: 'expense-123',
      description: 'Test expense',
      amount: 100,
      date: new Date('2024-01-15'),
      imageUrl: null,
      status: ExpenseStatus.PENDING,
      userId: 'other-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      approverId: null,
      approvalDate: null,
      rejectionReason: null,
      paidDate: null,
      paidAmount: null,
      user: { id: 'other-user', displayName: 'Other User', pictureUrl: null },
      approver: null,
    }

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense)

    const request = createRequest('expense-123')
    const response = await GET(request, { params: createParams('expense-123') })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('expense-123')
  })

  it('should return 403 for employee viewing other user expense', async () => {
    const mockExpense = {
      id: 'expense-123',
      description: 'Test expense',
      amount: 100,
      date: new Date('2024-01-15'),
      imageUrl: null,
      status: ExpenseStatus.PENDING,
      userId: 'other-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      approverId: null,
      approvalDate: null,
      rejectionReason: null,
      paidDate: null,
      paidAmount: null,
      user: { id: 'other-user', displayName: 'Other User', pictureUrl: null },
      approver: null,
    }

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', role: Role.EMPLOYEE },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense)

    const request = createRequest('expense-123')
    const response = await GET(request, { params: createParams('expense-123') })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Forbidden')
  })

  it('should include user and approver relations in response', async () => {
    const mockExpense = {
      id: 'expense-123',
      description: 'Test expense',
      amount: 100,
      date: new Date('2024-01-15'),
      imageUrl: null,
      status: ExpenseStatus.APPROVED,
      userId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      approverId: 'manager-123',
      approvalDate: new Date(),
      rejectionReason: null,
      paidDate: null,
      paidAmount: null,
      user: { id: 'user-123', displayName: 'Test User', pictureUrl: null },
      approver: { id: 'manager-123', displayName: 'Test Manager' },
    }

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', role: Role.EMPLOYEE },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense)

    const request = createRequest('expense-123')
    const response = await GET(request, { params: createParams('expense-123') })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user).toEqual({ id: 'user-123', displayName: 'Test User', pictureUrl: null })
    expect(data.approver).toEqual({ id: 'manager-123', displayName: 'Test Manager' })
  })

  it('should return paidAmount as string when expense has been paid', async () => {
    const mockExpense = {
      id: 'expense-123',
      description: 'Paid expense',
      amount: 100,
      date: new Date('2024-01-15'),
      imageUrl: null,
      status: ExpenseStatus.REIMBURSED,
      userId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      approverId: 'manager-123',
      approvalDate: new Date(),
      rejectionReason: null,
      paidDate: new Date('2024-01-20'),
      paidAmount: new Prisma.Decimal('150.50'),
      user: { id: 'user-123', displayName: 'Test User', pictureUrl: null },
      approver: { id: 'manager-123', displayName: 'Test Manager' },
    }

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', role: Role.EMPLOYEE },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense as any)

    const request = createRequest('expense-123')
    const response = await GET(request, { params: createParams('expense-123') })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.paidAmount).toBe('150.5')
    expect(typeof data.paidAmount).toBe('string')
  })
})
