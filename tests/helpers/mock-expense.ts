import { ExpenseStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

export interface MockExpense {
  id: string
  description: string
  amount: number
  date: Date
  imageUrl: string | null
  status: ExpenseStatus
  userId: string
  createdAt: Date
  updatedAt: Date
  approverId: string | null
  approvalDate: Date | null
  rejectionReason: string | null
  paidDate: Date | null
  paidAmount: Decimal | null
}

export interface MockExpenseWithUser extends MockExpense {
  user: {
    id: string
    displayName: string | null
    pictureUrl: string | null
  }
  approver?: {
    id: string
    displayName: string | null
    pictureUrl: string | null
  } | null
}

export function createMockExpense(overrides?: Partial<MockExpense>): MockExpense {
  const now = new Date()
  return {
    id: 'expense-123',
    description: 'Test expense',
    amount: 100,
    date: new Date('2024-01-15'),
    imageUrl: null,
    status: ExpenseStatus.PENDING,
    userId: 'user-123',
    createdAt: now,
    updatedAt: now,
    approverId: null,
    approvalDate: null,
    rejectionReason: null,
    paidDate: null,
    paidAmount: null,
    ...overrides,
  }
}

export function createMockExpenseWithUser(overrides?: Partial<MockExpenseWithUser>): MockExpenseWithUser {
  const expense = createMockExpense(overrides)
  return {
    ...expense,
    user: {
      id: expense.userId,
      displayName: 'Test User',
      pictureUrl: null,
    },
    approver: expense.approverId
      ? {
          id: expense.approverId,
          displayName: 'Test Manager',
          pictureUrl: null,
        }
      : null,
    ...overrides,
  }
}

export function createApprovedExpense(overrides?: Partial<MockExpense>): MockExpense {
  return createMockExpense({
    status: ExpenseStatus.APPROVED,
    approverId: 'manager-123',
    approvalDate: new Date(),
    ...overrides,
  })
}

export function createRejectedExpense(overrides?: Partial<MockExpense>): MockExpense {
  return createMockExpense({
    status: ExpenseStatus.REJECTED,
    approverId: 'manager-123',
    approvalDate: new Date(),
    rejectionReason: 'Missing receipt',
    ...overrides,
  })
}

export function createReimbursedExpense(overrides?: Partial<MockExpense>): MockExpense {
  return createMockExpense({
    status: ExpenseStatus.REIMBURSED,
    approverId: 'manager-123',
    approvalDate: new Date(),
    paidDate: new Date(),
    paidAmount: new Decimal(100),
    ...overrides,
  })
}
