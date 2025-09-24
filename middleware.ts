import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''

  // Only protect staging.hifinder.app
  if (!hostname.includes('staging.hifinder.app')) {
    return NextResponse.next()
  }

  // Check for Basic Auth header
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

  if (password === 'poppypreview') {
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