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
  selectedItems?: string[]
}): string {
  // Normalize parameters for consistent cache keys
  const normalized = {
    // Use exact budget - bucketing caused budget crossover bug where $200-$249
    // budgets shared cache entries, returning $249-budget results for $225 searches
    budget: params.budget,

    // Sort signatures for deterministic ordering
    signatures: params.soundSignatures.sort().join(','),

    type: params.headphoneType,

    // Only include requested components in key
    wants: Object.entries(params.wantRecommendationsFor)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .sort()
      .join(','),

    // Include selected items in cache key for budget-aware re-ranking
    selected: params.selectedItems?.length ? params.selectedItems.join(',') : '',
  }

  return `${normalized.budget}:${normalized.signatures}:${normalized.type}:${normalized.wants}:${normalized.selected}`
}

/**
 * Cache wrapper for recommendation computations.
 * Uses Next.js Data Cache with a 5-minute TTL and the 'recommendations' tag
 * so admin changes can bust the cache via revalidateTag('recommendations').
 */
export async function getCached<T>(
  cacheKey: string,
  computeFn: () => Promise<T>
): Promise<T> {
  const cachedFn = unstable_cache(
    computeFn,
    [`recommendations:${cacheKey}`],
    {
      revalidate: 300, // 5 minutes
      tags: ['recommendations'],
    }
  )
  return await cachedFn()
}
