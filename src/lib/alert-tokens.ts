import crypto from 'crypto'

const SECRET = process.env.CRON_SECRET || ''

export function generateUnsubscribeToken(alertId: string): string {
  const hmac = crypto.createHmac('sha256', SECRET)
  hmac.update(alertId)
  const signature = hmac.digest('hex')
  // Base64-encode "alertId:signature" for URL safety
  return Buffer.from(`${alertId}:${signature}`).toString('base64url')
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const [alertId, signature] = decoded.split(':')
    if (!alertId || !signature) return null

    const hmac = crypto.createHmac('sha256', SECRET)
    hmac.update(alertId)
    const expected = hmac.digest('hex')

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return alertId
    }
    return null
  } catch {
    return null
  }
}
