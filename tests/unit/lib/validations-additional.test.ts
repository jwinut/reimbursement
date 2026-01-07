import { describe, it, expect } from 'vitest'
import { ExpenseStatus } from '@prisma/client'
import {
  expenseFilterSchema,
  approvalSchema,
  rejectionSchema,
  paymentSchema,
} from '@/lib/validations'

describe('expenseFilterSchema', () => {
  it('should accept empty object with defaults', () => {
    const result = expenseFilterSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
    }
  })

  it('should accept valid status filter', () => {
    const result = expenseFilterSchema.safeParse({ status: ExpenseStatus.PENDING })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe(ExpenseStatus.PENDING)
    }
  })

  it('should accept all valid status values', () => {
    const statuses = [
      ExpenseStatus.PENDING,
      ExpenseStatus.APPROVED,
      ExpenseStatus.REJECTED,
      ExpenseStatus.REIMBURSED,
    ]

    statuses.forEach((status) => {
      const result = expenseFilterSchema.safeParse({ status })
      expect(result.success).toBe(true)
    })
  })

  it('should reject invalid status value', () => {
    const result = expenseFilterSchema.safeParse({ status: 'INVALID_STATUS' })
    expect(result.success).toBe(false)
  })

  it('should coerce page to number', () => {
    const result = expenseFilterSchema.safeParse({ page: '5' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(5)
    }
  })

  it('should reject page less than 1', () => {
    const result = expenseFilterSchema.safeParse({ page: 0 })
    expect(result.success).toBe(false)
  })

  it('should coerce limit to number', () => {
    const result = expenseFilterSchema.safeParse({ limit: '50' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(50)
    }
  })

  it('should reject limit less than 1', () => {
    const result = expenseFilterSchema.safeParse({ limit: 0 })
    expect(result.success).toBe(false)
  })

  it('should reject limit greater than 100', () => {
    const result = expenseFilterSchema.safeParse({ limit: 101 })
    expect(result.success).toBe(false)
  })

  it('should accept date range filters', () => {
    const result = expenseFilterSchema.safeParse({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.startDate).toBe('2024-01-01')
      expect(result.data.endDate).toBe('2024-12-31')
    }
  })
})

describe('approvalSchema', () => {
  it('should accept valid expense ID', () => {
    const result = approvalSchema.safeParse({ expenseId: 'expense-123' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expenseId).toBe('expense-123')
    }
  })

  it('should reject empty expense ID', () => {
    const result = approvalSchema.safeParse({ expenseId: '' })
    expect(result.success).toBe(false)
  })

  it('should reject missing expense ID', () => {
    const result = approvalSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('should accept UUID format expense ID', () => {
    const result = approvalSchema.safeParse({
      expenseId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })
})

describe('rejectionSchema', () => {
  it('should accept valid expense ID and reason', () => {
    const result = rejectionSchema.safeParse({
      expenseId: 'expense-123',
      reason: 'Missing receipt',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expenseId).toBe('expense-123')
      expect(result.data.reason).toBe('Missing receipt')
    }
  })

  it('should reject empty expense ID', () => {
    const result = rejectionSchema.safeParse({
      expenseId: '',
      reason: 'Missing receipt',
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing expense ID', () => {
    const result = rejectionSchema.safeParse({ reason: 'Missing receipt' })
    expect(result.success).toBe(false)
  })

  it('should reject empty reason', () => {
    const result = rejectionSchema.safeParse({
      expenseId: 'expense-123',
      reason: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing reason', () => {
    const result = rejectionSchema.safeParse({ expenseId: 'expense-123' })
    expect(result.success).toBe(false)
  })

  it('should reject reason over 500 characters', () => {
    const result = rejectionSchema.safeParse({
      expenseId: 'expense-123',
      reason: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('should accept reason at exactly 500 characters', () => {
    const result = rejectionSchema.safeParse({
      expenseId: 'expense-123',
      reason: 'a'.repeat(500),
    })
    expect(result.success).toBe(true)
  })
})

describe('paymentSchema', () => {
  it('should accept expense ID only (minimal)', () => {
    const result = paymentSchema.safeParse({ expenseId: 'expense-123' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expenseId).toBe('expense-123')
      expect(result.data.paidAmount).toBeUndefined()
      expect(result.data.paidDate).toBeUndefined()
    }
  })

  it('should reject empty expense ID', () => {
    const result = paymentSchema.safeParse({ expenseId: '' })
    expect(result.success).toBe(false)
  })

  it('should accept positive paid amount', () => {
    const result = paymentSchema.safeParse({
      expenseId: 'expense-123',
      paidAmount: 1500.50,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.paidAmount).toBe(1500.50)
    }
  })

  it('should reject zero paid amount', () => {
    const result = paymentSchema.safeParse({
      expenseId: 'expense-123',
      paidAmount: 0,
    })
    expect(result.success).toBe(false)
  })

  it('should reject negative paid amount', () => {
    const result = paymentSchema.safeParse({
      expenseId: 'expense-123',
      paidAmount: -100,
    })
    expect(result.success).toBe(false)
  })

  it('should accept valid paid date', () => {
    const result = paymentSchema.safeParse({
      expenseId: 'expense-123',
      paidDate: '2024-06-15',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.paidDate).toBe('2024-06-15')
    }
  })

  it('should accept ISO date format', () => {
    const result = paymentSchema.safeParse({
      expenseId: 'expense-123',
      paidDate: '2024-06-15T10:30:00Z',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid date format', () => {
    const result = paymentSchema.safeParse({
      expenseId: 'expense-123',
      paidDate: 'not-a-date',
    })
    expect(result.success).toBe(false)
  })

  it('should accept both paid amount and date together', () => {
    const result = paymentSchema.safeParse({
      expenseId: 'expense-123',
      paidAmount: 2500,
      paidDate: '2024-06-15',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.expenseId).toBe('expense-123')
      expect(result.data.paidAmount).toBe(2500)
      expect(result.data.paidDate).toBe('2024-06-15')
    }
  })
})
