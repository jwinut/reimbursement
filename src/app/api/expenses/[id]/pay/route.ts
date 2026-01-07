import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isManager, canTransitionTo } from '@/lib/permissions'
import { validateCsrfToken } from '@/lib/csrf'
import { ExpenseStatus } from '@prisma/client'
import { paymentSchema } from '@/lib/validations'
import { serializeExpense } from '@/lib/serialize'

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

    // Only managers can mark as paid
    if (!isManager(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden: Manager access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Parse and validate request body (optional fields)
    const body = await request.json().catch(() => ({}))
    const parseResult = paymentSchema.safeParse({ ...body, expenseId: id })
    if (!parseResult.success) {
      return NextResponse.json(
        { message: 'Validation error', errors: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { paidAmount, paidDate } = parseResult.data

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

    // Verify status transition is valid (only from APPROVED)
    if (!canTransitionTo(expense.status, ExpenseStatus.REIMBURSED, session.user.role)) {
      return NextResponse.json(
        { message: `Cannot mark as paid. Expense must be approved first. Current status: ${expense.status}` },
        { status: 400 }
      )
    }

    // Update the expense
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.REIMBURSED,
        paidDate: paidDate ? new Date(paidDate) : new Date(),
        paidAmount: paidAmount ?? expense.amount,
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

    return NextResponse.json(serializeExpense(updatedExpense))
  } catch (error) {
    console.error('Error marking expense as paid:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
