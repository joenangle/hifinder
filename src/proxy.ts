import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { safeEqual } from '@/lib/safe-compare'

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // Redirect removed dashboard tabs to canonical /gear page
  if (pathname === '/dashboard') {
    const tab = searchParams.get('tab')
    if (tab === 'gear') {
      const url = request.nextUrl.clone()
      url.pathname = '/gear'
      url.search = ''
      return NextResponse.redirect(url, 302)
    }
    if (tab === 'stacks') {
      const url = request.nextUrl.clone()
      url.pathname = '/gear'
      url.search = '?tab=stacks'
      return NextResponse.redirect(url, 302)
    }
  }

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

  // Decode credentials. Split on the first ':' only: the password may contain ':'.
  const decoded = Buffer.from(auth.slice(6), 'base64').toString()
  const password = decoded.slice(decoded.indexOf(':') + 1)

  // Get staging password from environment
  const STAGING_PASSWORD = process.env.STAGING_PASSWORD

  // In production builds, staging password must be set
  if (!STAGING_PASSWORD && hostname === 'staging.hifinder.app') {
    console.error('STAGING_PASSWORD environment variable is not set for staging')
    return new Response('Configuration error', {
      status: 500,
    })
  }

  if (STAGING_PASSWORD && decoded.includes(':') && safeEqual(password, STAGING_PASSWORD)) {
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