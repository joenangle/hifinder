import { NextResponse } from 'next/server'
import { supabaseServer } from './supabase-server'

/**
 * Fixed-window rate limiting backed by the `rate_limit_hit` Postgres function
 * (migrations/add-rate-limits.sql). Shared across all serverless instances and
 * free: it runs in the database we already have.
 */

export interface RateLimitRule {
  /** Distinguishes limits, e.g. "subscribe:ip". The subject is appended. */
  name: string
  windowSeconds: number
  max: number
}

/**
 * Record a hit for `subject` under `rule`; true if it's within the limit.
 *
 * Fails open: if the check itself errors (DB unreachable, function missing),
 * the request is allowed and the error logged. A broken limiter must not take
 * down signups, and the endpoints it guards also validate their input.
 */
export async function isWithinRateLimit(rule: RateLimitRule, subject: string): Promise<boolean> {
  const { data, error } = await supabaseServer.rpc('rate_limit_hit', {
    p_key: `${rule.name}:${subject}`,
    p_window_seconds: rule.windowSeconds,
    p_max: rule.max,
  })

  if (error) {
    console.error(`Rate limit check failed for ${rule.name}; allowing request:`, error)
    return true
  }
  return data !== false
}

/**
 * The caller's IP. On Vercel, x-forwarded-for is set by the edge and client
 * values are overwritten, so its first entry is the real client address.
 */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || null
}

export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  )
}
