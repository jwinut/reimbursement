import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isManager } from '@/lib/permissions'
import { validateCsrfToken } from '@/lib/csrf'
import { ExpenseStatus } from '@prisma/client'

interface BulkApproveRequest {
  ids: string[]
}

export async function POST(request: NextRequest) {
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

    const body: BulkApproveRequest = await request.json()
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: 'Invalid request: ids must be a non-empty array' },
        { status: 400 }
      )
    }

    if (ids.length > 100) {
      return NextResponse.json(
        { message: 'Too many items: maximum 100 at a time' },
        { status: 400 }
      )
    }

    // Fetch all expenses to validate they exist and are PENDING
    const expenses = await prisma.expense.findMany({
      where: {
        id: { in: ids },
      },
      select: {
        id: true,
        status: true,
      },
    })

    const foundIds = new Set(expenses.map((e) => e.id))
    const notFound = ids.filter((id) => !foundIds.has(id))
    const notPending = expenses.filter((e) => e.status !== ExpenseStatus.PENDING)

    if (notFound.length > 0) {
      return NextResponse.json(
        { message: `Expenses not found: ${notFound.join(', ')}` },
        { status: 404 }
      )
    }

    if (notPending.length > 0) {
      return NextResponse.json(
        {
          message: `Cannot approve expenses that are not pending`,
          failed: notPending.map((e) => e.id),
        },
        { status: 400 }
      )
    }

    // Bulk update all expenses in a transaction
    const result = await prisma.expense.updateMany({
      where: {
        id: { in: ids },
        status: ExpenseStatus.PENDING,
      },
      data: {
        status: ExpenseStatus.APPROVED,
        approverId: session.user.id,
        approvalDate: new Date(),
      },
    })

    return NextResponse.json({
      approved: result.count,
      message: `Successfully approved ${result.count} expense(s)`,
    })
  } catch (error) {
    console.error('Error bulk approving expenses:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
