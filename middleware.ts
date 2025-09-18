import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only protect staging/preview deployments, not production
  const url = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Skip protection for production domain and localhost only (not staging.hifinder.app)
  if (hostname === 'hifinder.app' || hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return NextResponse.next()
  }

  // Skip protection for API routes, auth routes, and static files
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/favicon') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for staging access cookie
  const stagingAccess = request.cookies.get('staging-access')

  if (stagingAccess?.value === 'granted') {
    return NextResponse.next()
  }

  // Check for password in form submission (POST request)
  const stagingPassword = process.env.STAGING_PASSWORD || 'hifi2024'

  if (request.method === 'POST') {
    try {
      const formData = await request.formData()
      const password = formData.get('pwd')

      if (password === stagingPassword) {
        const response = NextResponse.redirect(request.url)
        // Set cookie for 24 hours
        response.cookies.set('staging-access', 'granted', {
          maxAge: 24 * 60 * 60,
          httpOnly: true,
          secure: true,
          sameSite: 'lax'
        })
        return response
      }
    } catch (error) {
      console.error('Error processing form data:', error)
    }
  }

  // Show password prompt page
  return new NextResponse(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Staging Access - HiFinder</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          color: #ffffff;
          margin: 0;
          padding: 0;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container {
          background: rgba(45, 45, 45, 0.8);
          border: 1px solid #444;
          border-radius: 12px;
          padding: 2rem;
          max-width: 400px;
          width: 90%;
          text-align: center;
          backdrop-filter: blur(10px);
        }
        .logo {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 1rem;
          background: linear-gradient(45deg, #FF6B35, #F7931E);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        h1 {
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
          font-weight: 600;
        }
        p {
          color: #ccc;
          margin-bottom: 2rem;
          line-height: 1.5;
        }
        input {
          width: 100%;
          padding: 12px;
          border: 1px solid #555;
          border-radius: 6px;
          background: #333;
          color: #fff;
          font-size: 1rem;
          margin-bottom: 1rem;
          box-sizing: border-box;
        }
        input:focus {
          outline: none;
          border-color: #FF6B35;
        }
        button {
          width: 100%;
          padding: 12px;
          background: linear-gradient(45deg, #FF6B35, #F7931E);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        button:hover {
          transform: translateY(-1px);
        }
        .footer {
          margin-top: 2rem;
          font-size: 0.875rem;
          color: #888;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🎧 HiFinder</div>
        <h1>Staging Environment</h1>
        <p>This is a private staging environment. Please enter the access password to continue.</p>
        <form method="post">
          <input type="password" name="pwd" placeholder="Enter staging password" required autofocus>
          <button type="submit">Access Staging</button>
        </form>
        <div class="footer">
          Development Build • Access Restricted
        </div>
      </div>
    </body>
    </html>
  `, {
    status: 401,
    headers: {
      'Content-Type': 'text/html',
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}