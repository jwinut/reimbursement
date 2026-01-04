import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(
  _request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename

    // Validate filename (prevent path traversal)
    if (filename.includes('..') || filename.includes('/')) {
      return NextResponse.json(
        { message: 'Invalid filename' },
        { status: 400 }
      )
    }

    const filepath = join(process.cwd(), 'uploads', filename)
    const file = await readFile(filepath)

    // Determine content type
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    }

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentTypes[ext || ''] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'File not found' },
      { status: 404 }
    )
  }
}
