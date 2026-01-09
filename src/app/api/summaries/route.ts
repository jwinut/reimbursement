import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { validateCsrfToken } from '@/lib/csrf'
import { isManager } from '@/lib/permissions'
import {
  getAllSummaries,
  generateUserSummary,
  generateAllPendingSummaries,
} from '@/lib/summary-service'
import { SummaryTriggerType } from '@prisma/client'

// Schema for pagination query params
const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

// Schema for generate summary request body
const generateSummarySchema = z.object({
  userId: z.string().optional(),
  triggerType: z.literal('MANUAL'),
})

/**
 * GET /api/summaries
 * List all summaries with pagination (manager only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only managers can view all summaries
    if (!isManager(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden: Manager access required' },
        { status: 403 }
      )
    }

    // Parse and validate pagination params
    const searchParams = request.nextUrl.searchParams
    const parseResult = paginationSchema.safeParse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
    })

    if (!parseResult.success) {
      return NextResponse.json(
        { message: 'Invalid query parameters', errors: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { page, limit } = parseResult.data
    const offset = (page - 1) * limit

    const { summaries, total } = await getAllSummaries({ limit, offset })

    return NextResponse.json({
      summaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching summaries:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/summaries
 * Generate summary manually
 * - Manager can specify userId to generate for specific user
 * - If no userId provided, generates for all users with pending expenses
 */
export async function POST(request: NextRequest) {
  try {
    // Validate CSRF token for state-changing operations
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

    // Only managers can generate summaries
    if (!isManager(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden: Manager access required' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const parseResult = generateSummarySchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { message: 'Invalid request body', errors: parseResult.error.flatten() },
        { status: 400 }
      )
    }

    const { userId } = parseResult.data

    // triggerType is validated by Zod to only be 'MANUAL'
    const triggerTypeEnum = SummaryTriggerType.MANUAL

    if (userId) {
      // Generate summary for specific user
      const summary = await generateUserSummary({
        userId,
        triggerType: triggerTypeEnum,
      })

      if (!summary) {
        return NextResponse.json(
          { message: 'No pending expenses found for user or user not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(summary, { status: 201 })
    } else {
      // Generate summaries for all users with pending expenses
      const summaries = await generateAllPendingSummaries(triggerTypeEnum)

      if (summaries.length === 0) {
        return NextResponse.json(
          { message: 'No users with pending expenses found', summaries: [] },
          { status: 200 }
        )
      }

      return NextResponse.json(
        { message: `Generated ${summaries.length} summaries`, summaries },
        { status: 201 }
      )
    }
  } catch (error) {
    console.error('Error generating summary:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
