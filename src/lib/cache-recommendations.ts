import { unstable_cache } from 'next/cache'

/**
 * Cache key generator for recommendation queries
 * Creates deterministic keys based on normalized parameters
 */
export function generateCacheKey(params: {
  budget: number
  soundSignatures: string[]
  headphoneType: string
  wantRecommendationsFor: Record<string, boolean>
}): string {
  // Normalize parameters for consistent cache keys
  const normalized = {
    // Round budget to $50 buckets for better cache hit rate
    // $475 and $499 will use same cache entry as $500
    budget: Math.floor(params.budget / 50) * 50,

    // Sort signatures for deterministic ordering
    signatures: params.soundSignatures.sort().join(','),

    type: params.headphoneType,

    // Only include requested components in key
    wants: Object.entries(params.wantRecommendationsFor)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .sort()
      .join(','),
  }

  return `${normalized.budget}:${normalized.signatures}:${normalized.type}:${normalized.wants}`
}

/**
 * Cache wrapper for recommendation queries
 * Uses Vercel Data Cache (unstable_cache) for free, edge-optimized caching
 *
 * TTL: 10 minutes (600 seconds)
 * Tag: 'recommendations' - allows manual invalidation via revalidateTag()
 */
export const getCachedRecommendations = unstable_cache(
  async <T>(cacheKey: string, computeFn: () => Promise<T>): Promise<T> => {
    console.log('🔄 Cache MISS, computing:', cacheKey)
    const result = await computeFn()
    console.log('✅ Computed and cached:', cacheKey)
    return result
  },
  ['recommendations'], // Cache key prefix
  {
    revalidate: 600, // 10 minutes TTL (balance freshness vs performance)
    tags: ['recommendations'], // For manual invalidation
  }
)

/**
 * Type-safe wrapper that preserves return type
 */
export async function getCached<T>(
  cacheKey: string,
  computeFn: () => Promise<T>
): Promise<T> {
  return getCachedRecommendations(cacheKey, computeFn)
}
