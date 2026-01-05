import { describe, it, expect } from 'vitest'
import { expenseSchema } from '@/lib/validations'

describe('expenseSchema', () => {
  describe('description', () => {
    it('should reject empty description', () => {
      const result = expenseSchema.safeParse({
        description: '',
        amount: '100',
        date: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid description', () => {
      const result = expenseSchema.safeParse({
        description: 'Lunch meeting',
        amount: '100',
        date: '2024-01-01',
      })
      expect(result.success).toBe(true)
    })

    it('should reject description over 500 characters', () => {
      const result = expenseSchema.safeParse({
        description: 'a'.repeat(501),
        amount: '100',
        date: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('amount', () => {
    it('should reject zero amount', () => {
      const result = expenseSchema.safeParse({
        description: 'Test',
        amount: '0',
        date: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })

    it('should reject negative amount', () => {
      const result = expenseSchema.safeParse({
        description: 'Test',
        amount: '-100',
        date: '2024-01-01',
      })
      expect(result.success).toBe(false)
    })

    it('should accept positive amount', () => {
      const result = expenseSchema.safeParse({
        description: 'Test',
        amount: '250.50',
        date: '2024-01-01',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('date', () => {
    it('should reject invalid date format', () => {
      const result = expenseSchema.safeParse({
        description: 'Test',
        amount: '100',
        date: 'invalid-date',
      })
      expect(result.success).toBe(false)
    })

    it('should reject future date', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const result = expenseSchema.safeParse({
        description: 'Test',
        amount: '100',
        date: futureDate.toISOString().split('T')[0],
      })
      expect(result.success).toBe(false)
    })

    it('should accept past date', () => {
      const result = expenseSchema.safeParse({
        description: 'Test',
        amount: '100',
        date: '2024-01-01',
      })
      expect(result.success).toBe(true)
    })

    it('should accept today date', () => {
      const today = new Date().toISOString().split('T')[0]
      const result = expenseSchema.safeParse({
        description: 'Test',
        amount: '100',
        date: today,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('image', () => {
    it('should accept no image (optional field)', () => {
      const result = expenseSchema.safeParse({
        description: 'Test',
        amount: '100',
        date: '2024-01-01',
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid JPEG image under 5MB', () => {
      const mockFile = {
        size: 1024 * 1024, // 1MB
        type: 'image/jpeg',
      }
      const result = expenseSchema.safeParse({
        description: 'Test',
        amount: '100',
        date: '2024-01-01',
        image: mockFile,
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid PNG image', () => {
      const mockFile = {
        size: 2 * 1024 * 1024, // 2MB
        type: 'image/png',
      }
      const result = expenseSchema.safeParse({
        description: 'Test',
        amount: '100',
        date: '2024-01-01',
        image: mockFile,
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid WebP image', () => {
      const mockFile = {
        size: 1024 * 1024,
        type: 'image/webp',
      }
      const result = expenseSchema.safeParse({
        description: 'Test',
        amount: '100',
        date: '2024-01-01',
        image: mockFile,
      })
      expect(result.success).toBe(true)
    })

    it('should reject image over 5MB', () => {
      const mockFile = {
        size: 6 * 1024 * 1024, // 6MB
        type: 'image/jpeg',
      }
      const result = expenseSchema.safeParse({
        description: 'Test',
        amount: '100',
        date: '2024-01-01',
        image: mockFile,
      })
      expect(result.success).toBe(false)
    })

    it('should reject non-image file types', () => {
      const mockFile = {
        size: 1024 * 1024,
        type: 'application/pdf',
      }
      const result = expenseSchema.safeParse({
        description: 'Test',
        amount: '100',
        date: '2024-01-01',
        image: mockFile,
      })
      expect(result.success).toBe(false)
    })

    it('should reject GIF images', () => {
      const mockFile = {
        size: 1024 * 1024,
        type: 'image/gif',
      }
      const result = expenseSchema.safeParse({
        description: 'Test',
        amount: '100',
        date: '2024-01-01',
        image: mockFile,
      })
      expect(result.success).toBe(false)
    })
  })
})
