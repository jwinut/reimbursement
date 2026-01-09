import { NextRequest, NextResponse } from 'next/server'
import { generateAllPendingSummaries } from '@/lib/summary-service'
import { SummaryTriggerType } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    // Validate cron secret from Authorization header
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json(
        { message: 'Server configuration error' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Generate summaries for all users with pending expenses
    const summaries = await generateAllPendingSummaries(SummaryTriggerType.SCHEDULED)

    return NextResponse.json({
      message: 'Summaries generated successfully',
      count: summaries.length,
      summaries,
    })
  } catch (error) {
    console.error('Error generating scheduled summaries:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
