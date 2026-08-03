/**
 * Recommendation ranking evaluation harness.
 *
 * Runs `filterAndScoreComponents` over the real catalogue for a fixed set of
 * scenarios and scores the ranking quality with nDCG@5 and precision@5 against
 * a graded-relevance label (hand-curated `gold`, else a proxy — see
 * scripts/eval/fixtures.ts for the important caveat on what the proxy can and
 * cannot judge).
 *
 * Usage:
 *   npm run eval:reco                          # human-readable scorecard
 *   npm run eval:reco -- --json > base.json    # machine-readable, save baseline
 *   npm run eval:reco -- --baseline base.json  # scorecard + delta vs baseline
 *
 * The --json output of one revision is the --baseline input for the next, so a
 * scoring change becomes a printed delta table instead of a guess.
 */
import './eval/load-env' // MUST be first — see load-env.ts
import { createClient } from '@supabase/supabase-js'
import {
  filterAndScoreComponents,
  calculateSynergyScore,
} from '../src/app/api/recommendations/v2/route'
import {
  calculateExpertScore,
  calculateExpertConfidence,
  sinadToScore,
} from '../src/lib/crinacle-scoring'
import { SCENARIOS, normalizeKey, type EvalScenario } from './eval/fixtures'
import { ndcgAtK, precisionAtK } from './eval/metrics'
import { readFileSync } from 'fs'

const K = 5
const MAX_OPTIONS = 50 // enough candidates for a meaningful ideal ordering

type Component = Record<string, unknown> & {
  brand?: string | null
  name?: string | null
  category?: string
  crin_rank?: string | null
  crin_tone?: string | null
  crin_tech?: string | null
  crin_value?: number | null
  asr_sinad?: number | null
}

/**
 * Expert quality on 0–1, mirroring the ranker's expert term
 * (route.ts filterAndScoreComponents) WITHOUT price/bonus terms. Kept in sync
 * with that normalization so the label reflects the trusted quality axis.
 */
function expertQuality01(c: Component): number {
  const scoringData = {
    crin_rank: c.crin_rank ?? undefined,
    crin_tone: c.crin_tone ?? undefined,
    crin_tech: c.crin_tech ?? undefined,
    crin_value: c.crin_value ?? undefined,
    asr_sinad: c.asr_sinad ?? undefined,
  }
  const raw = calculateExpertScore(scoringData)
  const isHeadphone = c.category === 'cans' || c.category === 'iems'
  const isElectronics =
    c.category === 'dac' || c.category === 'amp' || c.category === 'dac_amp'

  if (isHeadphone) {
    const confidence = calculateExpertConfidence(scoringData)
    return (confidence > 0 ? raw * confidence : raw * 0.85) / 10
  }
  if (isElectronics) {
    return (c.asr_sinad != null ? sinadToScore(c.asr_sinad) : raw * 0.8) / 10
  }
  return raw / 10
}

/** Signature fit on 0–1 for the scenario. Signal gear is transparent → 1. */
function signatureFit01(c: Component, scenario: EvalScenario): number {
  if (c.category === 'cans' || c.category === 'iems') {
    return calculateSynergyScore(c, scenario.signatures)
  }
  return 1
}

/**
 * Graded relevance 0–3. `gold` label wins when present; otherwise a proxy that
 * blends expert quality (60%) and signature fit (40%), discretized. Thresholds
 * are documented knobs, not physics.
 */
function relevance(c: Component, scenario: EvalScenario): number {
  const key = normalizeKey(c.brand, c.name)
  if (scenario.gold && key in scenario.gold) return scenario.gold[key]

  const combined = 0.6 * expertQuality01(c) + 0.4 * signatureFit01(c, scenario)
  if (combined >= 0.75) return 3
  if (combined >= 0.6) return 2
  if (combined >= 0.45) return 1
  return 0
}

interface ScenarioResult {
  name: string
  ndcg5: number
  p5: number
  n: number // number of candidates the ranker returned
}
interface Scorecard {
  scenarios: Record<string, Omit<ScenarioResult, 'name'>>
  aggregate: { ndcg5: number; p5: number }
}

function fmt(x: number): string {
  return x.toFixed(4)
}

function loadBaseline(path: string): Scorecard | null {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as Scorecard
  } catch (e) {
    console.error(`Could not read baseline "${path}": ${(e as Error).message}`)
    return null
  }
}

async function main() {
  const args = process.argv.slice(2)
  const asJson = args.includes('--json')
  const baselineIdx = args.indexOf('--baseline')
  const baseline =
    baselineIdx >= 0 && args[baselineIdx + 1]
      ? loadBaseline(args[baselineIdx + 1])
      : null

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await db
    .from('components')
    .select('*')
    .in('category', ['cans', 'iems', 'dac', 'amp', 'dac_amp'])
    .order('price_used_min')

  if (error) throw error
  const catalogue = (data ?? []) as Component[]

  const results: ScenarioResult[] = []

  for (const s of SCENARIOS) {
    const pool = catalogue.filter((c) => c.category === s.category)
    const ranked = filterAndScoreComponents(
      pool as unknown[],
      s.budget,
      s.signatures,
      'music',
      MAX_OPTIONS
    ) as unknown as Component[]

    const rels = ranked.map((c) => relevance(c, s))
    results.push({
      name: s.name,
      ndcg5: ndcgAtK(rels, K),
      p5: precisionAtK(rels, K),
      n: ranked.length,
    })
  }

  const meanNdcg =
    results.reduce((sum, r) => sum + r.ndcg5, 0) / (results.length || 1)
  const meanP5 =
    results.reduce((sum, r) => sum + r.p5, 0) / (results.length || 1)

  const scorecard: Scorecard = {
    scenarios: Object.fromEntries(
      results.map((r) => [r.name, { ndcg5: r.ndcg5, p5: r.p5, n: r.n }])
    ),
    aggregate: { ndcg5: meanNdcg, p5: meanP5 },
  }

  if (asJson) {
    console.log(JSON.stringify(scorecard, null, 2))
    return
  }

  // Human-readable table (with optional delta vs baseline).
  const pad = (s: string, n: number) => s.padEnd(n)
  const padL = (s: string, n: number) => s.padStart(n)
  const delta = (cur: number, base?: number) =>
    base == null ? '' : padL((cur - base >= 0 ? '+' : '') + (cur - base).toFixed(4), 10)

  console.log(`\nRecommendation ranking eval — nDCG@${K}, precision@${K}\n`)
  console.log(
    pad('scenario', 22) +
      padL('nDCG@5', 10) +
      (baseline ? padL('Δ', 10) : '') +
      padL('P@5', 8) +
      (baseline ? padL('Δ', 10) : '') +
      padL('n', 5)
  )
  console.log('-'.repeat(baseline ? 75 : 45))
  for (const r of results) {
    const b = baseline?.scenarios[r.name]
    console.log(
      pad(r.name, 22) +
        padL(fmt(r.ndcg5), 10) +
        (baseline ? delta(r.ndcg5, b?.ndcg5) : '') +
        padL(fmt(r.p5), 8) +
        (baseline ? delta(r.p5, b?.p5) : '') +
        padL(String(r.n), 5)
    )
  }
  console.log('-'.repeat(baseline ? 75 : 45))
  const ba = baseline?.aggregate
  console.log(
    pad('AGGREGATE (mean)', 22) +
      padL(fmt(meanNdcg), 10) +
      (baseline ? delta(meanNdcg, ba?.ndcg5) : '') +
      padL(fmt(meanP5), 8) +
      (baseline ? delta(meanP5, ba?.p5) : '')
  )
  console.log('')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
