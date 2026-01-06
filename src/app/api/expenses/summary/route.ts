import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isManager } from '@/lib/permissions'
import { ExpenseStatus } from '@prisma/client'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only managers can access summary
    if (!isManager(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden: Manager access required' },
        { status: 403 }
      )
    }

    // Get counts by status
    const [pendingCount, approvedCount, rejectedCount, reimbursedCount] = await Promise.all([
      prisma.expense.count({ where: { status: ExpenseStatus.PENDING } }),
      prisma.expense.count({ where: { status: ExpenseStatus.APPROVED } }),
      prisma.expense.count({ where: { status: ExpenseStatus.REJECTED } }),
      prisma.expense.count({ where: { status: ExpenseStatus.REIMBURSED } }),
    ])

    // Get totals by status
    const [pendingTotal, approvedTotal, reimbursedTotal] = await Promise.all([
      prisma.expense.aggregate({
        where: { status: ExpenseStatus.PENDING },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { status: ExpenseStatus.APPROVED },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { status: ExpenseStatus.REIMBURSED },
        _sum: { amount: true },
      }),
    ])

    // Get recent pending expenses for quick action
    const recentPending = await prisma.expense.findMany({
      where: { status: ExpenseStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: 5,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            pictureUrl: true,
          },
        },
      },
    })

    return NextResponse.json({
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        reimbursed: reimbursedCount,
        total: pendingCount + approvedCount + rejectedCount + reimbursedCount,
      },
      totals: {
        pending: pendingTotal._sum.amount || 0,
        approved: approvedTotal._sum.amount || 0,
        reimbursed: reimbursedTotal._sum.amount || 0,
      },
      recentPending,
    })
  } catch (error) {
    console.error('Error fetching expense summary:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
