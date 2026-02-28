import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyUnsubscribeToken } from '@/lib/alert-tokens'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return new NextResponse('Missing token', { status: 400 })
  }

  const alertId = verifyUnsubscribeToken(token)
  if (!alertId) {
    return new NextResponse('Invalid or expired token', { status: 400 })
  }

  const { error } = await supabase
    .from('price_alerts')
    .update({ email_enabled: false })
    .eq('id', alertId)

  if (error) {
    console.error('Error unsubscribing:', error)
    return new NextResponse('Something went wrong', { status: 500 })
  }

  // Return a simple HTML page confirming unsubscribe
  return new NextResponse(
    `<!DOCTYPE html>
    <html><head><title>Unsubscribed</title></head>
    <body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f4f4f5">
      <div style="text-align:center;max-width:400px;padding:40px">
        <h1 style="font-size:24px;color:#18181b">Unsubscribed</h1>
        <p style="color:#71717a">You will no longer receive email notifications for this alert.</p>
        <a href="https://hifinder.app/dashboard" style="color:#18181b">Back to HiFinder</a>
      </div>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

// Also handle POST for one-click unsubscribe (RFC 8058)
export async function POST(request: Request) {
  return GET(request)
}
