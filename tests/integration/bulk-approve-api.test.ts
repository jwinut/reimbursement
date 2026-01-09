import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Role, ExpenseStatus } from '@prisma/client'
import { createMockRequest } from '../helpers/mock-api-request'

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
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: vi.fn(),
}))

vi.mock('@/lib/permissions', () => ({
  isManager: vi.fn((role: Role) => role === Role.MANAGER),
}))

import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { validateCsrfToken } from '@/lib/csrf'
import { POST } from '@/app/api/expenses/bulk-approve/route'

describe('POST /api/expenses/bulk-approve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 403 for invalid CSRF token', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(false)

    const request = createMockRequest('/api/expenses/bulk-approve', {
      method: 'POST',
      body: { ids: ['expense-1', 'expense-2'] },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Invalid CSRF token')
  })

  it('should return 401 for unauthenticated requests', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = createMockRequest('/api/expenses/bulk-approve', {
      method: 'POST',
      body: { ids: ['expense-1', 'expense-2'] },
    })

    const response = await POST(request)
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

    const request = createMockRequest('/api/expenses/bulk-approve', {
      method: 'POST',
      body: { ids: ['expense-1', 'expense-2'] },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.message).toBe('Forbidden: Manager access required')
  })

  it('should return 400 for empty array', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })

    const request = createMockRequest('/api/expenses/bulk-approve', {
      method: 'POST',
      body: { ids: [] },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe('Invalid request: ids must be a non-empty array')
  })

  it('should return 400 for non-array ids', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })

    const request = createMockRequest('/api/expenses/bulk-approve', {
      method: 'POST',
      body: { ids: 'expense-1' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe('Invalid request: ids must be a non-empty array')
  })

  it('should return 404 for non-existent expense IDs', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      { id: 'expense-1', status: ExpenseStatus.PENDING },
    ] as any)

    const request = createMockRequest('/api/expenses/bulk-approve', {
      method: 'POST',
      body: { ids: ['expense-1', 'expense-2', 'expense-3'] },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.message).toContain('Expenses not found')
    expect(data.message).toContain('expense-2')
    expect(data.message).toContain('expense-3')
  })

  it('should return 400 for expenses not in PENDING status', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      { id: 'expense-1', status: ExpenseStatus.PENDING },
      { id: 'expense-2', status: ExpenseStatus.APPROVED },
      { id: 'expense-3', status: ExpenseStatus.REJECTED },
    ] as any)

    const request = createMockRequest('/api/expenses/bulk-approve', {
      method: 'POST',
      body: { ids: ['expense-1', 'expense-2', 'expense-3'] },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe('Cannot approve expenses that are not pending')
    expect(data.failed).toContain('expense-2')
    expect(data.failed).toContain('expense-3')
  })

  it('should successfully bulk approve PENDING expenses', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      { id: 'expense-1', status: ExpenseStatus.PENDING },
      { id: 'expense-2', status: ExpenseStatus.PENDING },
    ] as any)
    vi.mocked(prisma.expense.updateMany).mockResolvedValue({ count: 2 })

    const request = createMockRequest('/api/expenses/bulk-approve', {
      method: 'POST',
      body: { ids: ['expense-1', 'expense-2'] },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.approved).toBe(2)
    expect(data.message).toBe('Successfully approved 2 expense(s)')
  })

  it('should call updateMany with correct parameters', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })
    vi.mocked(prisma.expense.findMany).mockResolvedValue([
      { id: 'expense-1', status: ExpenseStatus.PENDING },
      { id: 'expense-2', status: ExpenseStatus.PENDING },
    ] as any)
    vi.mocked(prisma.expense.updateMany).mockResolvedValue({ count: 2 })

    const request = createMockRequest('/api/expenses/bulk-approve', {
      method: 'POST',
      body: { ids: ['expense-1', 'expense-2'] },
    })

    await POST(request)

    expect(prisma.expense.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['expense-1', 'expense-2'] },
        status: ExpenseStatus.PENDING,
      },
      data: {
        status: ExpenseStatus.APPROVED,
        approverId: 'manager-123',
        approvalDate: expect.any(Date),
      },
    })
  })

  it('should return 400 for more than 100 items', async () => {
    vi.mocked(validateCsrfToken).mockReturnValue(true)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'manager-123', role: Role.MANAGER },
      expires: new Date().toISOString(),
    })

    const ids = Array.from({ length: 101 }, (_, i) => `expense-${i}`)
    const request = createMockRequest('/api/expenses/bulk-approve', {
      method: 'POST',
      body: { ids },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.message).toBe('Too many items: maximum 100 at a time')
  })
})
