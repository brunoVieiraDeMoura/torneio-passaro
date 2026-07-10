import { NextRequest, NextResponse } from 'next/server'

const ALLOWED = 'https://upload.wikimedia.org/wikipedia/commons/'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url || !url.startsWith(ALLOWED)) {
    return new NextResponse('Invalid URL', { status: 400 })
  }

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)' },
  })

  if (!res.ok) return new NextResponse('Not found', { status: res.status })

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const buffer = await res.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=604800, stale-while-revalidate=86400',
    },
  })
}
