import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isManager, canTransitionTo } from '@/lib/permissions'
import { validateCsrfToken } from '@/lib/csrf'
import { ExpenseStatus } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate CSRF token
    if (!validateCsrfToken(request)) {
      return NextResponse.json(
        { message: 'Invalid CSRF token' },
        { status: 403 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only managers can approve
    if (!isManager(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden: Manager access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Fetch the expense
    const expense = await prisma.expense.findUnique({
      where: { id },
    })

    if (!expense) {
      return NextResponse.json(
        { message: 'Expense not found' },
        { status: 404 }
      )
    }

    // Verify status transition is valid
    if (!canTransitionTo(expense.status, ExpenseStatus.APPROVED, session.user.role)) {
      return NextResponse.json(
        { message: `Cannot approve expense with status: ${expense.status}` },
        { status: 400 }
      )
    }

    // Update the expense
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.APPROVED,
        approverId: session.user.id,
        approvalDate: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            pictureUrl: true,
          },
        },
        approver: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    })

    return NextResponse.json(updatedExpense)
  } catch (error) {
    console.error('Error approving expense:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
