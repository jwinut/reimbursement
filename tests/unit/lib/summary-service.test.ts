import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExpenseStatus, SummaryTriggerType, Prisma } from '@prisma/client'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    expense: {
      findMany: vi.fn(),
    },
    summary: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  generateUserSummary,
  generateAllPendingSummaries,
  getUserSummaries,
  getAllSummaries,
  getSummaryById,
} from '@/lib/summary-service'

describe('summary-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateUserSummary', () => {
    it('should return null if user not found', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const result = await generateUserSummary({
        userId: 'non-existent',
        triggerType: SummaryTriggerType.MANUAL,
      })

      expect(result).toBeNull()
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
        select: { id: true, displayName: true, pictureUrl: true },
      })
    })

    it('should return null if no pending expenses', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        displayName: 'Test User',
        pictureUrl: null,
        lineId: 'line-1',
        role: 'EMPLOYEE',
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      vi.mocked(prisma.expense.findMany).mockResolvedValue([])

      const result = await generateUserSummary({
        userId: 'user-1',
        triggerType: SummaryTriggerType.MANUAL,
      })

      expect(result).toBeNull()
      expect(prisma.summary.create).not.toHaveBeenCalled()
    })

    it('should create summary with correct data', async () => {
      const mockUser = {
        id: 'user-1',
        displayName: 'Test User',
        pictureUrl: 'https://example.com/avatar.jpg',
        lineId: 'line-1',
        role: 'EMPLOYEE',
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockExpenses = [
        {
          id: 'expense-1',
          description: 'Lunch',
          amount: 300,
          date: new Date('2024-01-02'),
          status: ExpenseStatus.PENDING,
          userId: 'user-1',
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          approverId: null,
          approvalDate: null,
          rejectionReason: null,
          paidDate: null,
          paidAmount: null,
        },
        {
          id: 'expense-2',
          description: 'Transport',
          amount: 200,
          date: new Date('2024-01-03'),
          status: ExpenseStatus.PENDING,
          userId: 'user-1',
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          approverId: null,
          approvalDate: null,
          rejectionReason: null,
          paidDate: null,
          paidAmount: null,
        },
      ]

      const mockCreatedSummary = {
        id: 'summary-1',
        userId: 'user-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        totalAmount: new Prisma.Decimal(500),
        expenseCount: 2,
        expenses: [],
        triggerType: SummaryTriggerType.MANUAL,
        createdAt: new Date('2024-01-05T12:00:00Z'),
        user: {
          displayName: 'Test User',
          pictureUrl: 'https://example.com/avatar.jpg',
        },
      }

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
      vi.mocked(prisma.expense.findMany).mockResolvedValue(mockExpenses)
      vi.mocked(prisma.summary.create).mockResolvedValue(mockCreatedSummary)

      const result = await generateUserSummary({
        userId: 'user-1',
        triggerType: SummaryTriggerType.MANUAL,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
      })

      expect(result).not.toBeNull()
      expect(result!.id).toBe('summary-1')
      expect(result!.userId).toBe('user-1')
      expect(result!.userName).toBe('Test User')
      expect(result!.totalAmount).toBe('500')
      expect(result!.expenseCount).toBe(2)

      expect(prisma.summary.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          expenseCount: 2,
          triggerType: SummaryTriggerType.MANUAL,
        }),
        include: {
          user: {
            select: { displayName: true, pictureUrl: true },
          },
        },
      })
    })

    it('should calculate total amount correctly', async () => {
      const mockUser = {
        id: 'user-1',
        displayName: 'Test User',
        pictureUrl: null,
        lineId: 'line-1',
        role: 'EMPLOYEE',
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockExpenses = [
        {
          id: 'expense-1',
          description: 'Item 1',
          amount: 100.5,
          date: new Date(),
          status: ExpenseStatus.PENDING,
          userId: 'user-1',
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          approverId: null,
          approvalDate: null,
          rejectionReason: null,
          paidDate: null,
          paidAmount: null,
        },
        {
          id: 'expense-2',
          description: 'Item 2',
          amount: 200.25,
          date: new Date(),
          status: ExpenseStatus.PENDING,
          userId: 'user-1',
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          approverId: null,
          approvalDate: null,
          rejectionReason: null,
          paidDate: null,
          paidAmount: null,
        },
      ]

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
      vi.mocked(prisma.expense.findMany).mockResolvedValue(mockExpenses)
      vi.mocked(prisma.summary.create).mockResolvedValue({
        id: 'summary-1',
        userId: 'user-1',
        startDate: new Date(),
        endDate: new Date(),
        totalAmount: new Prisma.Decimal(300.75),
        expenseCount: 2,
        expenses: [],
        triggerType: SummaryTriggerType.MANUAL,
        createdAt: new Date(),
        user: { displayName: 'Test User', pictureUrl: null },
      })

      await generateUserSummary({
        userId: 'user-1',
        triggerType: SummaryTriggerType.MANUAL,
      })

      expect(prisma.summary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalAmount: expect.any(Prisma.Decimal),
          }),
        })
      )
    })
  })

  describe('generateAllPendingSummaries', () => {
    it('should return empty array when no users have pending expenses', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([])

      const result = await generateAllPendingSummaries()

      expect(result).toEqual([])
    })

    it('should generate summaries for all users with pending expenses', async () => {
      const mockUsers = [{ id: 'user-1' }, { id: 'user-2' }]

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any)

      // Mock user lookup for each user
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({
          id: 'user-1',
          displayName: 'User 1',
          pictureUrl: null,
          lineId: 'line-1',
          role: 'EMPLOYEE',
          isApproved: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'user-2',
          displayName: 'User 2',
          pictureUrl: null,
          lineId: 'line-2',
          role: 'EMPLOYEE',
          isApproved: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

      // Mock expenses for each user
      vi.mocked(prisma.expense.findMany)
        .mockResolvedValueOnce([
          {
            id: 'expense-1',
            description: 'Expense 1',
            amount: 100,
            date: new Date(),
            status: ExpenseStatus.PENDING,
            userId: 'user-1',
            imageUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            approverId: null,
            approvalDate: null,
            rejectionReason: null,
            paidDate: null,
            paidAmount: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'expense-2',
            description: 'Expense 2',
            amount: 200,
            date: new Date(),
            status: ExpenseStatus.PENDING,
            userId: 'user-2',
            imageUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            approverId: null,
            approvalDate: null,
            rejectionReason: null,
            paidDate: null,
            paidAmount: null,
          },
        ])

      // Mock summary creation
      vi.mocked(prisma.summary.create)
        .mockResolvedValueOnce({
          id: 'summary-1',
          userId: 'user-1',
          startDate: new Date(),
          endDate: new Date(),
          totalAmount: new Prisma.Decimal(100),
          expenseCount: 1,
          expenses: [],
          triggerType: SummaryTriggerType.SCHEDULED,
          createdAt: new Date(),
          user: { displayName: 'User 1', pictureUrl: null },
        })
        .mockResolvedValueOnce({
          id: 'summary-2',
          userId: 'user-2',
          startDate: new Date(),
          endDate: new Date(),
          totalAmount: new Prisma.Decimal(200),
          expenseCount: 1,
          expenses: [],
          triggerType: SummaryTriggerType.SCHEDULED,
          createdAt: new Date(),
          user: { displayName: 'User 2', pictureUrl: null },
        })

      const result = await generateAllPendingSummaries()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('summary-1')
      expect(result[1].id).toBe('summary-2')
    })

    it('should use SCHEDULED trigger type by default', async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: 'user-1' }] as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        displayName: 'User 1',
        pictureUrl: null,
        lineId: 'line-1',
        role: 'EMPLOYEE',
        isApproved: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      vi.mocked(prisma.expense.findMany).mockResolvedValue([
        {
          id: 'expense-1',
          description: 'Expense 1',
          amount: 100,
          date: new Date(),
          status: ExpenseStatus.PENDING,
          userId: 'user-1',
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          approverId: null,
          approvalDate: null,
          rejectionReason: null,
          paidDate: null,
          paidAmount: null,
        },
      ])
      vi.mocked(prisma.summary.create).mockResolvedValue({
        id: 'summary-1',
        userId: 'user-1',
        startDate: new Date(),
        endDate: new Date(),
        totalAmount: new Prisma.Decimal(100),
        expenseCount: 1,
        expenses: [],
        triggerType: SummaryTriggerType.SCHEDULED,
        createdAt: new Date(),
        user: { displayName: 'User 1', pictureUrl: null },
      })

      await generateAllPendingSummaries()

      expect(prisma.summary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            triggerType: SummaryTriggerType.SCHEDULED,
          }),
        })
      )
    })
  })

  describe('getUserSummaries', () => {
    it('should return summaries with pagination', async () => {
      const mockSummaries = [
        {
          id: 'summary-1',
          userId: 'user-1',
          startDate: new Date(),
          endDate: new Date(),
          totalAmount: new Prisma.Decimal(500),
          expenseCount: 3,
          expenses: [],
          triggerType: SummaryTriggerType.MANUAL,
          createdAt: new Date(),
          user: { displayName: 'User 1', pictureUrl: null },
        },
      ]

      vi.mocked(prisma.summary.findMany).mockResolvedValue(mockSummaries)
      vi.mocked(prisma.summary.count).mockResolvedValue(1)

      const result = await getUserSummaries('user-1', { limit: 10, offset: 0 })

      expect(result.summaries).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(prisma.summary.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
        include: {
          user: { select: { displayName: true, pictureUrl: true } },
        },
      })
    })

    it('should use default pagination values', async () => {
      vi.mocked(prisma.summary.findMany).mockResolvedValue([])
      vi.mocked(prisma.summary.count).mockResolvedValue(0)

      await getUserSummaries('user-1')

      expect(prisma.summary.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
          skip: 0,
        })
      )
    })
  })

  describe('getAllSummaries', () => {
    it('should return all summaries with pagination', async () => {
      const mockSummaries = [
        {
          id: 'summary-1',
          userId: 'user-1',
          startDate: new Date(),
          endDate: new Date(),
          totalAmount: new Prisma.Decimal(500),
          expenseCount: 3,
          expenses: [],
          triggerType: SummaryTriggerType.MANUAL,
          createdAt: new Date(),
          user: { displayName: 'User 1', pictureUrl: null },
        },
        {
          id: 'summary-2',
          userId: 'user-2',
          startDate: new Date(),
          endDate: new Date(),
          totalAmount: new Prisma.Decimal(300),
          expenseCount: 2,
          expenses: [],
          triggerType: SummaryTriggerType.SCHEDULED,
          createdAt: new Date(),
          user: { displayName: 'User 2', pictureUrl: 'https://example.com/avatar.jpg' },
        },
      ]

      vi.mocked(prisma.summary.findMany).mockResolvedValue(mockSummaries)
      vi.mocked(prisma.summary.count).mockResolvedValue(2)

      const result = await getAllSummaries({ limit: 10, offset: 0 })

      expect(result.summaries).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(prisma.summary.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
        include: {
          user: { select: { displayName: true, pictureUrl: true } },
        },
      })
    })

    it('should not filter by userId', async () => {
      vi.mocked(prisma.summary.findMany).mockResolvedValue([])
      vi.mocked(prisma.summary.count).mockResolvedValue(0)

      await getAllSummaries()

      expect(prisma.summary.findMany).toHaveBeenCalledWith(
        expect.not.objectContaining({
          where: expect.anything(),
        })
      )
    })
  })

  describe('getSummaryById', () => {
    it('should return null if summary not found', async () => {
      vi.mocked(prisma.summary.findUnique).mockResolvedValue(null)

      const result = await getSummaryById('non-existent')

      expect(result).toBeNull()
    })

    it('should return summary data', async () => {
      const mockSummary = {
        id: 'summary-1',
        userId: 'user-1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        totalAmount: new Prisma.Decimal(500),
        expenseCount: 3,
        expenses: [
          { id: 'exp-1', description: 'Item', amount: 500, date: '2024-01-02', status: 'PENDING' },
        ],
        triggerType: SummaryTriggerType.MANUAL,
        createdAt: new Date('2024-01-05T12:00:00Z'),
        user: { displayName: 'Test User', pictureUrl: 'https://example.com/avatar.jpg' },
      }

      vi.mocked(prisma.summary.findUnique).mockResolvedValue(mockSummary)

      const result = await getSummaryById('summary-1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('summary-1')
      expect(result!.userName).toBe('Test User')
      expect(result!.userPictureUrl).toBe('https://example.com/avatar.jpg')
      expect(result!.totalAmount).toBe('500')
      expect(result!.expenseCount).toBe(3)
      expect(result!.expenses).toHaveLength(1)
    })

    it('should convert dates to ISO strings', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z')
      const endDate = new Date('2024-01-05T00:00:00Z')
      const createdAt = new Date('2024-01-05T12:00:00Z')

      vi.mocked(prisma.summary.findUnique).mockResolvedValue({
        id: 'summary-1',
        userId: 'user-1',
        startDate,
        endDate,
        totalAmount: new Prisma.Decimal(500),
        expenseCount: 3,
        expenses: [],
        triggerType: SummaryTriggerType.MANUAL,
        createdAt,
        user: { displayName: 'Test User', pictureUrl: null },
      })

      const result = await getSummaryById('summary-1')

      expect(result!.startDate).toBe(startDate.toISOString())
      expect(result!.endDate).toBe(endDate.toISOString())
      expect(result!.createdAt).toBe(createdAt.toISOString())
    })
  })
})
