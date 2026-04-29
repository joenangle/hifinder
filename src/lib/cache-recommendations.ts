import { unstable_cache } from 'next/cache'

/**
 * Deterministic stringification: sort object keys so key equality is value-based.
 * Used for nested params (existingGear, customBudgetAllocation) where object
 * property order must not affect cache-key identity.
 */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
}

export interface RecommendationCacheParams {
  budget: number
  soundSignatures: string[]
  headphoneType: string
  wantRecommendationsFor: Record<string, boolean>
  selectedItems?: string[]
  // v3.3 scoring inputs that must be in the key to prevent cross-request leakage.
  budgetRangeMin?: number
  budgetRangeMax?: number
  driverType?: string
  usageRanking?: string[]
  usage?: string
  excludedUsages?: string[]
  connectivity?: string[]
  existingHeadphones?: string
  existingGear?: Record<string, unknown>
  customBudgetAllocation?: Record<string, unknown> | null
}

/**
 * Cache key generator for recommendation queries. Any field that changes the
 * cached computation MUST be in the key — missing fields cause cross-user
 * cache leakage (e.g., different driverType values sharing an entry).
 */
export function generateCacheKey(params: RecommendationCacheParams): string {
  const parts: Array<string | number> = [
    // Use exact budget — bucketing caused a prior bug where $200–$249 budgets
    // shared cache entries, returning $249-budget results for $225 searches.
    params.budget,
    params.budgetRangeMin ?? '',
    params.budgetRangeMax ?? '',
    // Sort for deterministic ordering of all multi-value fields.
    [...params.soundSignatures].sort().join(','),
    params.headphoneType,
    params.driverType ?? '',
    [...(params.usageRanking ?? [])].sort().join(','),
    params.usage ?? '',
    [...(params.excludedUsages ?? [])].sort().join(','),
    [...(params.connectivity ?? [])].sort().join(','),
    Object.entries(params.wantRecommendationsFor)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .sort()
      .join(','),
    params.selectedItems?.length ? [...params.selectedItems].sort().join(',') : '',
    params.existingHeadphones ?? '',
    stableStringify(params.existingGear ?? {}),
    stableStringify(params.customBudgetAllocation ?? null),
  ]
  return parts.join('|')
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
