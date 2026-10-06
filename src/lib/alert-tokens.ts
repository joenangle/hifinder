import crypto from 'crypto'

// Read at call time, not module load, and never fall back to an empty key:
// an HMAC keyed with '' lets anyone mint valid unsubscribe tokens.
function getSecret(): string | null {
  return process.env.CRON_SECRET || null
}

function sign(secret: string, alertId: string): string {
  return crypto.createHmac('sha256', secret).update(alertId).digest('hex')
}

export function generateUnsubscribeToken(alertId: string): string {
  const secret = getSecret()
  if (!secret) {
    throw new Error('CRON_SECRET is not set; refusing to issue unsubscribe tokens')
  }
  // Base64-encode "alertId:signature" for URL safety
  return Buffer.from(`${alertId}:${sign(secret, alertId)}`).toString('base64url')
}

export function verifyUnsubscribeToken(token: string): string | null {
  const secret = getSecret()
  if (!secret) return null

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const [alertId, signature] = decoded.split(':')
    if (!alertId || !signature) return null

    const expected = sign(secret, alertId)

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return alertId
    }
    return null
  } catch {
    return null
  }
}
