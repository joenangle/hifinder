/**
 * Seed the Stereo Builder catalog (speakers and speaker amps).
 *
 * Reads scripts/stereo-seed/stereo-seed.json, validates every entry
 * (src/lib/stereo/seed.ts), and inserts or updates rows in `components`.
 * Matching is case-insensitive brand + name within the stereo categories only,
 * so a headphone row that happens to share a name is never touched.
 *
 * Usage:
 *   npm run seed:stereo               # dry run (default): reads the DB, writes nothing
 *   npm run seed:stereo -- --execute  # apply inserts and updates
 */
import './eval/load-env' // MUST be first: loads .env.local before anything reads process.env
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { STEREO_CATEGORIES } from '../src/lib/component-categories'
import { validateSeedEntry, type SeedEntry } from '../src/lib/stereo/seed'
import type { Database, Json } from '../src/types/supabase'

const SEED_FILE = join(__dirname, 'stereo-seed', 'stereo-seed.json')
const SOURCE = 'stereo_seed'

const keyOf = (brand: string, name: string) => `${brand.trim().toLowerCase()}\u0000${name.trim().toLowerCase()}`
const label = (e: { brand: string; name: string }) => `${e.brand} ${e.name}`

async function main() {
  const execute = process.argv.includes('--execute')

  const raw: unknown = JSON.parse(readFileSync(SEED_FILE, 'utf8'))
  if (!Array.isArray(raw)) throw new Error(`${SEED_FILE} must contain a JSON array`)

  console.log(`Stereo catalog seed: ${raw.length} entries in file\n`)

  const valid: SeedEntry[] = []
  const invalid: { index: number; label: string; errors: string[] }[] = []
  const seen = new Set<string>()

  raw.forEach((item, index) => {
    const result = validateSeedEntry(item)
    if (!result.ok) {
      const rec = (item ?? {}) as { brand?: unknown; name?: unknown }
      const name = typeof rec.brand === 'string' && typeof rec.name === 'string' ? `${rec.brand} ${rec.name}` : `#${index}`
      invalid.push({ index, label: name, errors: result.errors })
      return
    }
    const key = keyOf(result.entry.brand, result.entry.name)
    if (seen.has(key)) {
      invalid.push({ index, label: label(result.entry), errors: ['duplicate brand + name within the seed file'] })
      return
    }
    seen.add(key)
    valid.push(result.entry)
  })

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Existing stereo rows only: headphone rows can never match.
  const { data: existing, error } = await supabase
    .from('components')
    .select('id, brand, name')
    .in('category', [...STEREO_CATEGORIES])
  if (error) throw new Error(`Failed to load existing stereo rows: ${error.message}`)

  const existingByKey = new Map((existing ?? []).map((r) => [keyOf(r.brand, r.name), r.id]))
  const toInsert = valid.filter((e) => !existingByKey.has(keyOf(e.brand, e.name)))
  const toUpdate = valid.filter((e) => existingByKey.has(keyOf(e.brand, e.name)))

  console.log('📊 Summary:')
  console.log(`  - Valid: ${valid.length}`)
  console.log(`  - Invalid: ${invalid.length}`)
  console.log(`  - To insert: ${toInsert.length}`)
  console.log(`  - To update: ${toUpdate.length}`)

  for (const bad of invalid) {
    console.log(`\n❌ Invalid entry ${bad.label} (index ${bad.index}):`)
    for (const msg of bad.errors) console.log(`    - ${msg}`)
  }
  for (const e of toInsert) console.log(`➕ Insert: ${label(e)} (${e.category})`)
  for (const e of toUpdate) console.log(`🔄 Update: ${label(e)} (${e.category})`)

  if (!execute) {
    console.log('\n⚠️  DRY RUN MODE - No changes made')
    console.log('Run with --execute to apply changes')
    return
  }

  if (invalid.length > 0) {
    console.error('\n🛑 Refusing to write while invalid entries exist. Fix the seed file first.')
    process.exit(1)
  }

  console.log('\n🚀 Executing...')
  let failures = 0

  for (const e of toInsert) {
    const { error: insertError } = await supabase.from('components').insert({
      brand: e.brand,
      name: e.name,
      category: e.category,
      technical_specs: e.technical_specs as unknown as Json,
      price_new: e.price_new ?? null,
      manufacturer_url: e.manufacturer_url ?? null,
      source: SOURCE,
    })
    if (insertError) {
      failures++
      console.error(`Error inserting ${label(e)}: ${insertError.message}`)
    }
  }

  for (const e of toUpdate) {
    const id = existingByKey.get(keyOf(e.brand, e.name))!
    const { error: updateError } = await supabase
      .from('components')
      .update({
        technical_specs: e.technical_specs as unknown as Json,
        price_new: e.price_new ?? null,
        manufacturer_url: e.manufacturer_url ?? null,
        source: SOURCE,
      })
      .eq('id', id)
      .in('category', [...STEREO_CATEGORIES])
    if (updateError) {
      failures++
      console.error(`Error updating ${label(e)}: ${updateError.message}`)
    }
  }

  if (failures > 0) {
    console.error(`\n❌ Finished with ${failures} failure(s)`)
    process.exit(1)
  }
  console.log('\n✅ Seed complete!')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
