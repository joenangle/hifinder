/**
 * Ranking snapshot harness.
 *
 * Runs filterAndScoreComponents over real catalogue data for a fixed set of
 * scenarios and prints the top N per scenario as JSON. Run it on two revisions
 * and diff the output to see exactly how a scoring change moves results.
 *
 * Usage: npx tsx scripts/_rank-snapshot.ts > /tmp/snapshot.json
 */
import { createClient } from '@supabase/supabase-js'
import { filterAndScoreComponents } from '../src/app/api/recommendations/v2/route'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SCENARIOS: { name: string; category: string; budget: number; signatures: string[] }[] = [
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

const TOP_N = 20

async function main() {
  const { data, error } = await db
    .from('components')
    .select('*')
    .in('category', ['cans', 'iems', 'dac', 'amp', 'dac_amp'])
    .order('price_used_min')

  if (error) throw error

  const out: Record<string, { rank: number; name: string; score: number }[]> = {}

  for (const s of SCENARIOS) {
    const pool = data!.filter(c => c.category === s.category)
    const scored = filterAndScoreComponents(pool, s.budget, s.signatures, 'music', 50)
    // matchScore is attached during scoring but isn't on the declared return type.
    out[s.name] = scored.slice(0, TOP_N).map((c, i) => ({
      rank: i + 1,
      name: `${c.brand} ${c.name}`,
      score: (c as unknown as { matchScore: number }).matchScore,
    }))
  }

  console.log(JSON.stringify(out, null, 2))
}

main().catch(e => { console.error(e); process.exit(1) })
