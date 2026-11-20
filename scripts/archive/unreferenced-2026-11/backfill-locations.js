#!/usr/bin/env node

/**
 * Backfill location_state and location_country from freeform location text.
 * Usage:
 *   node scripts/backfill-locations.js --dry-run   # Preview changes
 *   node scripts/backfill-locations.js --execute    # Apply changes
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const { normalizeLocation } = require('./location-normalizer')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const execute = process.argv.includes('--execute')

  if (!dryRun && !execute) {
    console.log('Usage: node scripts/backfill-locations.js --dry-run|--execute')
    process.exit(1)
  }

  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}`)
  console.log()

  // Fetch all listings that need backfilling
  const { data: listings, error } = await supabase
    .from('used_listings')
    .select('id, location, source, location_state, location_country')
    .is('location_state', null)
    .is('location_country', null)
    .not('location', 'is', null)

  if (error) {
    console.error('Error fetching listings:', error)
    process.exit(1)
  }

  console.log(`Found ${listings.length} listings to process`)

  let updated = 0
  let skipped = 0
  let ambiguous = []

  for (const listing of listings) {
    const normalized = normalizeLocation(listing.location)

    if (!normalized.state && !normalized.country) {
      const loc = listing.location?.trim()
      const knownBad = ['Unknown', 'Reverb', 'eBay', 'Head-Fi']
      if (loc && !knownBad.includes(loc) && loc.length > 2) {
        ambiguous.push({ id: listing.id, location: listing.location, source: listing.source })
      }
      skipped++
      continue
    }

    if (dryRun) {
      console.log(`  ${listing.location} (${listing.source}) -> state=${normalized.state}, country=${normalized.country}`)
    } else {
      const { error: updateError } = await supabase
        .from('used_listings')
        .update({
          location_state: normalized.state,
          location_country: normalized.country,
        })
        .eq('id', listing.id)

      if (updateError) {
        console.error(`  Error updating ${listing.id}:`, updateError.message)
        continue
      }
    }

    updated++
  }

  console.log()
  console.log(`Results:`)
  console.log(`  Updated: ${updated}`)
  console.log(`  Skipped (no parse): ${skipped}`)
  console.log(`  Ambiguous: ${ambiguous.length}`)

  if (ambiguous.length > 0) {
    console.log()
    console.log(`Ambiguous entries (could not parse):`)
    ambiguous.forEach(a => console.log(`  "${a.location}" (${a.source}) [${a.id}]`))
  }
}

main().catch(console.error)
