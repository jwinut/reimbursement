import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateCsrfToken } from '@/lib/csrf'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

// Input sanitization helper
function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Basic XSS prevention
    .slice(0, 500) // Limit length
}

export async function POST(request: NextRequest) {
  try {
    // Validate CSRF token for state-changing operations
    if (!validateCsrfToken(request)) {
      return NextResponse.json(
        { message: 'Invalid CSRF token' },
        { status: 403 }
      )
    }

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()

    // Extract and validate fields
    const description = formData.get('description') as string
    const amountStr = formData.get('amount') as string
    const dateStr = formData.get('date') as string
    const image = formData.get('image') as File | null

    // Validate required fields
    if (!description || !amountStr || !dateStr) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Sanitize inputs
    const sanitizedDescription = sanitizeString(description)

    // Validate amount
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Validate date
    const date = new Date(dateStr)
    if (isNaN(date.getTime()) || date > new Date()) {
      return NextResponse.json(
        { message: 'Invalid date' },
        { status: 400 }
      )
    }

    // Handle image upload
    let imageUrl: string | null = null
    if (image && image.size > 0) {
      // Validate image
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(image.type)) {
        return NextResponse.json(
          { message: 'Invalid image type. Only JPEG, PNG, and WebP are allowed.' },
          { status: 400 }
        )
      }

      const maxSize = 5 * 1024 * 1024 // 5MB
      if (image.size > maxSize) {
        return NextResponse.json(
          { message: 'Image too large. Maximum size is 5MB.' },
          { status: 400 }
        )
      }

      // Generate unique filename
      const ext = image.name.split('.').pop() || 'jpg'
      const filename = `${randomUUID()}.${ext}`
      const uploadDir = join(process.cwd(), 'uploads')

      // Ensure upload directory exists
      await mkdir(uploadDir, { recursive: true })

      // Save file
      const bytes = await image.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(join(uploadDir, filename), buffer)

      imageUrl = `/uploads/${filename}`
    }

    // Create expense in database
    const expense = await prisma.expense.create({
      data: {
        description: sanitizedDescription,
        amount,
        date,
        imageUrl,
        userId: session.user.id,
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const expenses = await prisma.expense.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
