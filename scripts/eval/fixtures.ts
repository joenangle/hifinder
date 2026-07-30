/**
 * Evaluation scenarios for the recommendation ranker.
 *
 * Each scenario is a (category, budget, signature) request. Relevance labels
 * are computed two ways in eval-recommendations.ts:
 *
 *   1. A `gold` map (authoritative, hand-curated) when present, keyed by
 *      normalizeKey(brand, name). Add entries here after inspecting real
 *      `npm run eval:reco` output — only for models you've verified exist and
 *      genuinely deserve their grade.
 *   2. Otherwise a PROXY relevance derived from expert quality + signature fit,
 *      deliberately excluding the ranker's price/proximity/bonus terms.
 *
 * IMPORTANT: the proxy is valid for judging price-model, synergy, and
 * ranking-ORDER changes (WS3/WS4) — it detects when those push genuinely good
 * gear out of the top slots. It is NOT a valid judge of changes to the expert
 * or signature sub-scores themselves (that would be circular); extend `gold`
 * for those.
 */

export type EvalCategory = 'cans' | 'iems' | 'dac' | 'amp' | 'dac_amp'

export interface EvalScenario {
  name: string
  category: EvalCategory
  budget: number
  signatures: string[]
  /** Hand-curated graded relevance (0–3), keyed by normalizeKey(brand, name). */
  gold?: Record<string, number>
}

/** Stable identity for a component across environments: lowercased "brand name". */
export function normalizeKey(brand?: string | null, name?: string | null): string {
  return `${brand ?? ''} ${name ?? ''}`.toLowerCase().replace(/\s+/g, ' ').trim()
}

export const SCENARIOS: EvalScenario[] = [
  { name: 'cans-300-neutral', category: 'cans', budget: 300, signatures: ['neutral'] },
  { name: 'cans-300-warm', category: 'cans', budget: 300, signatures: ['warm'] },
  { name: 'cans-1000-neutral', category: 'cans', budget: 1000, signatures: ['neutral'] },
  { name: 'cans-150-fun', category: 'cans', budget: 150, signatures: ['fun'] },
  { name: 'iems-100-neutral', category: 'iems', budget: 100, signatures: ['neutral'] },
  { name: 'iems-100-v', category: 'iems', budget: 100, signatures: ['v-shaped'] },
  { name: 'iems-500-bright', category: 'iems', budget: 500, signatures: ['bright'] },
  { name: 'iems-250-multi', category: 'iems', budget: 250, signatures: ['warm', 'neutral'] },
  { name: 'amp-300-any', category: 'amp', budget: 300, signatures: ['any'] },
  { name: 'dac-200-any', category: 'dac', budget: 200, signatures: ['any'] },
]
