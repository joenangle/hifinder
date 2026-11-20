import { createHash, timingSafeEqual } from 'crypto'

/**
 * Constant-time string equality for secrets (cron bearer tokens, staging
 * password). Both sides are hashed first so the comparison runs over equal
 * lengths: `timingSafeEqual` throws on a length mismatch, and returning early
 * on length would leak the secret's length.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}
