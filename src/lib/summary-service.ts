import { prisma } from '@/lib/prisma'
import { ExpenseStatus, SummaryTriggerType, Prisma } from '@prisma/client'

export interface ExpenseSnapshot {
  id: string
  description: string
  amount: number
  date: string
  status: ExpenseStatus
}

export interface SummaryData {
  id: string
  userId: string
  userName: string | null
  userPictureUrl: string | null
  startDate: string
  endDate: string
  totalAmount: string
  expenseCount: number
  expenses: ExpenseSnapshot[]
  triggerType: SummaryTriggerType
  createdAt: string
}

export interface GenerateSummaryOptions {
  userId: string
  triggerType: SummaryTriggerType
  startDate?: Date
  endDate?: Date
}

/**
 * Generate a summary for a specific user's pending expenses
 */
export async function generateUserSummary(
  options: GenerateSummaryOptions
): Promise<SummaryData | null> {
  const { userId, triggerType, startDate, endDate } = options

  const now = new Date()
  const summaryStartDate = startDate || getLastSummaryDate()
  const summaryEndDate = endDate || now

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      pictureUrl: true,
    },
  })

  if (!user) {
    return null
  }

  // Get pending expenses for the user within date range
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      status: ExpenseStatus.PENDING,
      createdAt: {
        gte: summaryStartDate,
        lte: summaryEndDate,
      },
    },
    orderBy: { date: 'desc' },
  })

  // If no pending expenses, don't create a summary
  if (expenses.length === 0) {
    return null
  }

  // Calculate total amount
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  // Create expense snapshots
  const expenseSnapshots: ExpenseSnapshot[] = expenses.map(exp => ({
    id: exp.id,
    description: exp.description,
    amount: exp.amount,
    date: exp.date.toISOString(),
    status: exp.status,
  }))

  // Create summary in database
  const summary = await prisma.summary.create({
    data: {
      userId,
      startDate: summaryStartDate,
      endDate: summaryEndDate,
      totalAmount: new Prisma.Decimal(totalAmount),
      expenseCount: expenses.length,
      expenses: expenseSnapshots as unknown as Prisma.InputJsonValue,
      triggerType,
    },
    include: {
      user: {
        select: {
          displayName: true,
          pictureUrl: true,
        },
      },
    },
  })

  return {
    id: summary.id,
    userId: summary.userId,
    userName: summary.user.displayName,
    userPictureUrl: summary.user.pictureUrl,
    startDate: summary.startDate.toISOString(),
    endDate: summary.endDate.toISOString(),
    totalAmount: summary.totalAmount.toString(),
    expenseCount: summary.expenseCount,
    expenses: expenseSnapshots,
    triggerType: summary.triggerType,
    createdAt: summary.createdAt.toISOString(),
  }
}

/**
 * Generate summaries for all users with pending expenses
 * Used by scheduled job
 */
export async function generateAllPendingSummaries(
  triggerType: SummaryTriggerType = SummaryTriggerType.SCHEDULED
): Promise<SummaryData[]> {
  // Get all users with pending expenses
  const usersWithPending = await prisma.user.findMany({
    where: {
      expenses: {
        some: {
          status: ExpenseStatus.PENDING,
        },
      },
    },
    select: {
      id: true,
    },
  })

  const summaries: SummaryData[] = []

  for (const user of usersWithPending) {
    const summary = await generateUserSummary({
      userId: user.id,
      triggerType,
    })
    if (summary) {
      summaries.push(summary)
    }
  }

  return summaries
}

/**
 * Get summaries for a specific user
 */
export async function getUserSummaries(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ summaries: SummaryData[]; total: number }> {
  const { limit = 20, offset = 0 } = options

  const [summaries, total] = await Promise.all([
    prisma.summary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            displayName: true,
            pictureUrl: true,
          },
        },
      },
    }),
    prisma.summary.count({ where: { userId } }),
  ])

  return {
    summaries: summaries.map(summary => ({
      id: summary.id,
      userId: summary.userId,
      userName: summary.user.displayName,
      userPictureUrl: summary.user.pictureUrl,
      startDate: summary.startDate.toISOString(),
      endDate: summary.endDate.toISOString(),
      totalAmount: summary.totalAmount.toString(),
      expenseCount: summary.expenseCount,
      expenses: summary.expenses as unknown as ExpenseSnapshot[],
      triggerType: summary.triggerType,
      createdAt: summary.createdAt.toISOString(),
    })),
    total,
  }
}

/**
 * Get all summaries (for managers)
 */
export async function getAllSummaries(
  options: { limit?: number; offset?: number } = {}
): Promise<{ summaries: SummaryData[]; total: number }> {
  const { limit = 20, offset = 0 } = options

  const [summaries, total] = await Promise.all([
    prisma.summary.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            displayName: true,
            pictureUrl: true,
          },
        },
      },
    }),
    prisma.summary.count(),
  ])

  return {
    summaries: summaries.map(summary => ({
      id: summary.id,
      userId: summary.userId,
      userName: summary.user.displayName,
      userPictureUrl: summary.user.pictureUrl,
      startDate: summary.startDate.toISOString(),
      endDate: summary.endDate.toISOString(),
      totalAmount: summary.totalAmount.toString(),
      expenseCount: summary.expenseCount,
      expenses: summary.expenses as unknown as ExpenseSnapshot[],
      triggerType: summary.triggerType,
      createdAt: summary.createdAt.toISOString(),
    })),
    total,
  }
}

/**
 * Get a single summary by ID
 */
export async function getSummaryById(id: string): Promise<SummaryData | null> {
  const summary = await prisma.summary.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          displayName: true,
          pictureUrl: true,
        },
      },
    },
  })

  if (!summary) {
    return null
  }

  return {
    id: summary.id,
    userId: summary.userId,
    userName: summary.user.displayName,
    userPictureUrl: summary.user.pictureUrl,
    startDate: summary.startDate.toISOString(),
    endDate: summary.endDate.toISOString(),
    totalAmount: summary.totalAmount.toString(),
    expenseCount: summary.expenseCount,
    expenses: summary.expenses as unknown as ExpenseSnapshot[],
    triggerType: summary.triggerType,
    createdAt: summary.createdAt.toISOString(),
  }
}

/**
 * Calculate the last summary date (previous Tuesday or Friday)
 */
function getLastSummaryDate(): Date {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday, 2 = Tuesday, 5 = Friday

  let daysBack: number

  if (dayOfWeek === 2) {
    // Today is Tuesday, go back to last Friday (4 days)
    daysBack = 4
  } else if (dayOfWeek === 5) {
    // Today is Friday, go back to last Tuesday (3 days)
    daysBack = 3
  } else if (dayOfWeek < 2) {
    // Sunday or Monday, go back to last Friday
    daysBack = dayOfWeek + 2 // Sunday=2, Monday=3
  } else if (dayOfWeek < 5) {
    // Wednesday or Thursday, go back to Tuesday
    daysBack = dayOfWeek - 2 // Wed=1, Thu=2
  } else {
    // Saturday, go back to Friday (1 day)
    daysBack = 1
  }

  const lastSummaryDate = new Date(now)
  lastSummaryDate.setDate(now.getDate() - daysBack)
  lastSummaryDate.setHours(0, 0, 0, 0)

  return lastSummaryDate
}
