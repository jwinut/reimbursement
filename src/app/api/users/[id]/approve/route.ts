import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isManager } from '@/lib/permissions'
import { validateCsrfToken } from '@/lib/csrf'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    if (!isManager(session.user.role)) {
      return NextResponse.json(
        { message: 'Forbidden: Manager access required' },
        { status: 403 }
      )
    }

    // Verify CSRF token
    if (!validateCsrfToken(request)) {
      return NextResponse.json({ message: 'Invalid CSRF token' }, { status: 403 })
    }

    const { id } = await params

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Update user approval status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isApproved: true },
      select: {
        id: true,
        displayName: true,
        isApproved: true,
      },
    })

    return NextResponse.json({
      message: 'User approved successfully',
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error approving user:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
