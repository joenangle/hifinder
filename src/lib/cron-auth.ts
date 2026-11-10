import { NextResponse } from 'next/server'
import { safeEqual } from './safe-compare'

/**
 * Gate for cron/automation routes called with `Authorization: Bearer $CRON_SECRET`.
 * Returns a response to send back when the request must be rejected, or null
 * when it may proceed. An unset CRON_SECRET is a 500, never an open door.
 */
export function checkCronAuth(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization') ?? ''
  if (!safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
