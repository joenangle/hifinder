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
  }

  return `${normalized.budget}:${normalized.signatures}:${normalized.type}:${normalized.wants}`
}

/**
 * V3: DISABLE CACHING TEMPORARILY for debugging
 *
 * The unstable_cache API is not working as expected.
 * Disabling cache entirely to verify algorithm fixes work correctly.
 * Will re-enable with proper implementation once verified.
 */
export async function getCached<T>(
  cacheKey: string,
  computeFn: () => Promise<T>
): Promise<T> {
  console.log('⚠️  Cache DISABLED (debugging) - computing:', cacheKey)
  const result = await computeFn()
  console.log('✅ Computed (no cache):', cacheKey)
  return result
}
