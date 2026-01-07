import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role, ExpenseStatus } from '@prisma/client'
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
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: vi.fn(),
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { validateCsrfToken } from '@/lib/csrf'
import { POST } from '@/app/api/expenses/[id]/reject/route'

function createRequest(id: string, body: object, csrfToken = 'valid-token'): NextRequest {
  const headers = new Headers()
  headers.set('X-CSRF-Token', csrfToken)
  headers.set('Cookie', `csrf-token=${csrfToken}`)
  headers.set('Content-Type', 'application/json')

  return new NextRequest(`http://localhost:3000/api/expenses/${id}/reject`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function createParams(id: string): Promise<{ id: string }> {
  return Promise.resolve({ id })
}

describe('POST /api/expenses/[id]/reject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 403 for invalid CSRF token', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(false)

    const request = createRequest('expense-123', { reason: 'No receipt' })
    const response = await POST(request, { params: createParams('expense-123') })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Invalid CSRF token')
  })

  it('should return 401 for unauthenticated requests', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = createRequest('expense-123', { reason: 'No receipt' })
    const response = await POST(request, { params: createParams('expense-123') })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.message).toBe('Unauthorized')
  })

  it('should return 403 for non-manager users', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', role: Role.EMPLOYEE },
      expires: new Date().toISOString(),
    })

    const request = createRequest('expense-123', { reason: 'No receipt' })
    const response = await POST(request, { params: createParams('expense-123') })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Forbidden: Manager access required')
  })

  it('should return 400 for missing rejection reason', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })

    const request = createRequest('expense-123', {})
    const response = await POST(request, { params: createParams('expense-123') })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe('Validation error')
  })

  it('should return 400 for empty rejection reason', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })

    const request = createRequest('expense-123', { reason: '' })
    const response = await POST(request, { params: createParams('expense-123') })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe('Validation error')
  })

  it('should return 404 for non-existent expense', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(null)

    const request = createRequest('non-existent', { reason: 'No receipt' })
    const response = await POST(request, { params: createParams('non-existent') })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.message).toBe('Expense not found')
  })

  it('should return 400 for expense not in PENDING status', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.expense.findUnique).mockResolvedValue({
      id: 'expense-123',
      status: ExpenseStatus.APPROVED,
      userId: 'user-123',
      description: 'Test',
      amount: 100,
      date: new Date(),
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      approverId: null,
      approvalDate: null,
      rejectionReason: null,
      paidDate: null,
      paidAmount: null,
    })

    const request = createRequest('expense-123', { reason: 'No receipt' })
    const response = await POST(request, { params: createParams('expense-123') })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toContain('Cannot reject expense')
  })

  it('should successfully reject PENDING expense with reason', async () => {
    const mockExpense = {
      id: 'expense-123',
      status: ExpenseStatus.PENDING,
      userId: 'user-123',
      description: 'Test',
      amount: 100,
      date: new Date(),
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      approverId: null,
      approvalDate: null,
      rejectionReason: null,
      paidDate: null,
      paidAmount: null,
    }

    const updatedExpense = {
      ...mockExpense,
      status: ExpenseStatus.REJECTED,
      approverId: 'manager-123',
      approvalDate: new Date(),
      rejectionReason: 'No receipt attached',
      user: { id: 'user-123', displayName: 'Test User', pictureUrl: null },
      approver: { id: 'manager-123', displayName: 'Test Manager' },
    }

    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense)
    vi.mocked(prisma.expense.update).mockResolvedValue(updatedExpense)

    const request = createRequest('expense-123', { reason: 'No receipt attached' })
    const response = await POST(request, { params: createParams('expense-123') })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe(ExpenseStatus.REJECTED)
    expect(data.rejectionReason).toBe('No receipt attached')
  })

  it('should store rejectionReason in database', async () => {
    const mockExpense = {
      id: 'expense-123',
      status: ExpenseStatus.PENDING,
      userId: 'user-123',
      description: 'Test',
      amount: 100,
      date: new Date(),
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      approverId: null,
      approvalDate: null,
      rejectionReason: null,
      paidDate: null,
      paidAmount: null,
    }

    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(mockExpense)
    vi.mocked(prisma.expense.update).mockResolvedValue({
      ...mockExpense,
      status: ExpenseStatus.REJECTED,
      user: { id: 'user-123', displayName: 'User', pictureUrl: null },
      approver: { id: 'manager-123', displayName: 'Manager' },
    } as any)

    const request = createRequest('expense-123', { reason: 'Missing documentation' })
    await POST(request, { params: createParams('expense-123') })

    expect(prisma.expense.update).toHaveBeenCalledWith({
      where: { id: 'expense-123' },
      data: expect.objectContaining({
        status: ExpenseStatus.REJECTED,
        rejectionReason: 'Missing documentation',
        approverId: 'manager-123',
        approvalDate: expect.any(Date),
      }),
      include: expect.any(Object),
    })
  })
})
