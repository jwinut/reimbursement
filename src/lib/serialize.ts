import { Prisma } from '@prisma/client'

type ExpenseWithDecimal = {
  paidAmount?: Prisma.Decimal | null
  [key: string]: unknown
}

/**
 * Serializes an expense object for JSON response.
 * Converts Prisma Decimal fields to strings to ensure proper JSON serialization.
 */
export function serializeExpense<T extends ExpenseWithDecimal>(expense: T): Omit<T, 'paidAmount'> & { paidAmount: string | null } {
  return {
    ...expense,
    paidAmount: expense.paidAmount?.toString() ?? null,
  }
}

/**
 * Serializes an array of expenses for JSON response.
 */
export function serializeExpenses<T extends ExpenseWithDecimal>(expenses: T[]): Array<Omit<T, 'paidAmount'> & { paidAmount: string | null }> {
  return expenses.map(serializeExpense)
}
