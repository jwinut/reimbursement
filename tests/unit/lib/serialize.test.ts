import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'
import { serializeExpense, serializeExpenses } from '@/lib/serialize'

describe('serializeExpense', () => {
  describe('paidAmount conversion', () => {
    it('should convert Prisma Decimal to string', () => {
      const expense = {
        id: 'expense-123',
        description: 'Test expense',
        amount: new Prisma.Decimal('100.50'),
        paidAmount: new Prisma.Decimal('100.50'),
        status: 'PAID',
      }

      const result = serializeExpense(expense)

      expect(result.paidAmount).toBe('100.5')
      expect(typeof result.paidAmount).toBe('string')
    })

    it('should handle Decimal with many decimal places', () => {
      const expense = {
        id: 'expense-123',
        paidAmount: new Prisma.Decimal('1234.567890'),
      }

      const result = serializeExpense(expense)

      expect(result.paidAmount).toBe('1234.56789')
    })

    it('should handle large Decimal values', () => {
      const expense = {
        id: 'expense-123',
        paidAmount: new Prisma.Decimal('999999999.99'),
      }

      const result = serializeExpense(expense)

      expect(result.paidAmount).toBe('999999999.99')
    })

    it('should handle zero Decimal value', () => {
      const expense = {
        id: 'expense-123',
        paidAmount: new Prisma.Decimal('0'),
      }

      const result = serializeExpense(expense)

      expect(result.paidAmount).toBe('0')
    })
  })

  describe('null paidAmount handling', () => {
    it('should keep null paidAmount as null', () => {
      const expense = {
        id: 'expense-123',
        description: 'Unpaid expense',
        paidAmount: null,
        status: 'PENDING',
      }

      const result = serializeExpense(expense)

      expect(result.paidAmount).toBeNull()
    })

    it('should keep undefined paidAmount as null', () => {
      const expense = {
        id: 'expense-123',
        description: 'No paidAmount field',
      }

      const result = serializeExpense(expense)

      expect(result.paidAmount).toBeNull()
    })
  })

  describe('other fields passthrough', () => {
    it('should pass through all other fields unchanged', () => {
      const expense = {
        id: 'expense-123',
        description: 'Test expense',
        amount: new Prisma.Decimal('500.00'),
        paidAmount: new Prisma.Decimal('500.00'),
        status: 'PAID',
        date: new Date('2024-01-15'),
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-15'),
        userId: 'user-456',
        imageUrl: 'https://example.com/receipt.jpg',
      }

      const result = serializeExpense(expense)

      expect(result.id).toBe('expense-123')
      expect(result.description).toBe('Test expense')
      expect(result.amount).toEqual(new Prisma.Decimal('500.00'))
      expect(result.status).toBe('PAID')
      expect(result.date).toEqual(new Date('2024-01-15'))
      expect(result.createdAt).toEqual(new Date('2024-01-10'))
      expect(result.updatedAt).toEqual(new Date('2024-01-15'))
      expect(result.userId).toBe('user-456')
      expect(result.imageUrl).toBe('https://example.com/receipt.jpg')
    })

    it('should preserve nested objects', () => {
      const expense = {
        id: 'expense-123',
        paidAmount: new Prisma.Decimal('100'),
        user: {
          id: 'user-456',
          displayName: 'John Doe',
        },
      }

      const result = serializeExpense(expense)

      expect(result.user).toEqual({
        id: 'user-456',
        displayName: 'John Doe',
      })
    })

    it('should preserve array fields', () => {
      const expense = {
        id: 'expense-123',
        paidAmount: new Prisma.Decimal('100'),
        tags: ['travel', 'food'],
      }

      const result = serializeExpense(expense)

      expect(result.tags).toEqual(['travel', 'food'])
    })
  })
})

describe('serializeExpenses', () => {
  describe('array serialization', () => {
    it('should serialize an array of expenses', () => {
      const expenses = [
        {
          id: 'expense-1',
          description: 'Expense 1',
          paidAmount: new Prisma.Decimal('100.00'),
        },
        {
          id: 'expense-2',
          description: 'Expense 2',
          paidAmount: new Prisma.Decimal('200.50'),
        },
        {
          id: 'expense-3',
          description: 'Expense 3',
          paidAmount: new Prisma.Decimal('300.75'),
        },
      ]

      const result = serializeExpenses(expenses)

      expect(result).toHaveLength(3)
      expect(result[0]!.paidAmount).toBe('100')
      expect(result[1]!.paidAmount).toBe('200.5')
      expect(result[2]!.paidAmount).toBe('300.75')
    })

    it('should handle empty array', () => {
      const expenses: Array<{ id: string; paidAmount: Prisma.Decimal | null }> = []

      const result = serializeExpenses(expenses)

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('should handle array with mixed null and Decimal paidAmounts', () => {
      const expenses = [
        {
          id: 'expense-1',
          paidAmount: new Prisma.Decimal('100.00'),
          status: 'PAID',
        },
        {
          id: 'expense-2',
          paidAmount: null,
          status: 'PENDING',
        },
        {
          id: 'expense-3',
          paidAmount: new Prisma.Decimal('300.00'),
          status: 'PAID',
        },
      ]

      const result = serializeExpenses(expenses)

      expect(result).toHaveLength(3)
      expect(result[0]!.paidAmount).toBe('100')
      expect(result[1]!.paidAmount).toBeNull()
      expect(result[2]!.paidAmount).toBe('300')
    })

    it('should preserve all other fields for each expense in array', () => {
      const expenses = [
        {
          id: 'expense-1',
          description: 'First expense',
          paidAmount: new Prisma.Decimal('100.00'),
          status: 'PAID',
          userId: 'user-1',
        },
        {
          id: 'expense-2',
          description: 'Second expense',
          paidAmount: new Prisma.Decimal('200.00'),
          status: 'APPROVED',
          userId: 'user-2',
        },
      ]

      const result = serializeExpenses(expenses)

      expect(result[0]!.id).toBe('expense-1')
      expect(result[0]!.description).toBe('First expense')
      expect(result[0]!.status).toBe('PAID')
      expect(result[0]!.userId).toBe('user-1')

      expect(result[1]!.id).toBe('expense-2')
      expect(result[1]!.description).toBe('Second expense')
      expect(result[1]!.status).toBe('APPROVED')
      expect(result[1]!.userId).toBe('user-2')
    })
  })
})
