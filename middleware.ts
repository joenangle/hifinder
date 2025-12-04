import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''

  // Only protect staging.hifinder.app specifically
  // Allow production and preview URLs to pass through
  if (hostname !== 'staging.hifinder.app') {
    return NextResponse.next()
  }

  // Check for Basic Auth header on staging only
  const auth = request.headers.get('authorization')

  if (!auth?.startsWith('Basic ')) {
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Staging"',
      },
    })
  }

  // Decode credentials
  const [, password] = Buffer.from(auth.slice(6), 'base64').toString().split(':')

  // Get staging password from environment
  const STAGING_PASSWORD = process.env.STAGING_PASSWORD

  // In production builds, staging password must be set
  if (!STAGING_PASSWORD && hostname === 'staging.hifinder.app') {
    console.error('STAGING_PASSWORD environment variable is not set for staging')
    return new Response('Configuration error', {
      status: 500,
    })
  }

  if (password === STAGING_PASSWORD) {
    return NextResponse.next()
  }

  return new Response('Invalid credentials', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Staging"',
    },
  })
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
}