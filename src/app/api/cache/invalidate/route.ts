import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import { checkCronAuth } from '@/lib/cron-auth'

/**
 * Cache invalidation endpoint
 * POST /api/cache/invalidate
 *
 * Allows manual cache purging when data changes:
 * - After Reddit scraper runs and updates used listings
 * - After component database updates
 * - After expert data imports (Crinacle, ASR, etc.)
 *
 * Usage:
 * fetch('/api/cache/invalidate', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ tag: 'recommendations' })
 * })
 */
export async function POST(request: NextRequest) {
  const denied = checkCronAuth(request)
  if (denied) return denied

  try {
    const { tag } = await request.json()

    // Invalidate all recommendation caches
    // Next.js 16: revalidateTag now requires cacheLife profile as 2nd argument
    // 'max' enables stale-while-revalidate (serve stale, fetch fresh in background)
    revalidateTag(tag || 'recommendations', 'max')

    return NextResponse.json({
      success: true,
      message: `Cache invalidated for tag: ${tag || 'recommendations'}`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Failed to invalidate cache:', error)
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    )
  }
}
