#!/usr/bin/env node
/**
 * Aggregate sold listings into price_history table.
 *
 * Computes median, min, max, and count from actual sold listings per component,
 * grouped by source. Only includes non-bundle, non-zero-price sold listings.
 *
 * Usage:
 *   node scripts/aggregate-market-prices.js           # dry run (preview)
 *   node scripts/aggregate-market-prices.js --execute  # write to DB
 *   node scripts/aggregate-market-prices.js --execute --recent  # only last 180 days
 */

const { execSync } = require('child_process')
const { readFileSync } = require('fs')
const { resolve } = require('path')

const envFile = resolve(__dirname, '..', '.env.local')
const lines = readFileSync(envFile, 'utf8').split('\n')
const get = (key) => {
  const line = lines.find((l) => l.startsWith(`${key}=`))
  return line ? line.slice(key.length + 1) : null
}

const password = get('SUPABASE_DB_PASSWORD')
const dbUrl = get('DATABASE_URL')
if (!password || !dbUrl) {
  console.error('Missing SUPABASE_DB_PASSWORD or DATABASE_URL in .env.local')
  process.exit(1)
}

const args = process.argv.slice(2)
const execute = args.includes('--execute')
const recentOnly = args.includes('--recent')

const MIN_SALES = 3 // minimum sold listings to generate a price point
const RECENT_DAYS = 180 // for --recent mode

function runSQL(sql) {
  const result = execSync(`PGPASSWORD="${password}" psql "${dbUrl}" -t -A -F'|' -c "${sql.replace(/"/g, '\\"')}"`, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  })
  return result.trim().split('\n').filter(Boolean).map(row => row.split('|'))
}

// Aggregate sold listings into price stats per component per source
const dateFilter = recentOnly
  ? `AND ul.date_posted >= NOW() - INTERVAL '${RECENT_DAYS} days'`
  : ''

const aggregateSQL = `
SELECT
  ul.component_id,
  c.brand || ' ' || c.name as product,
  ul.source,
  COUNT(*) as sold_count,
  ROUND(MIN(ul.price)) as price_min,
  ROUND(MAX(ul.price)) as price_max,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ul.price)) as median_price
FROM used_listings ul
JOIN components c ON c.id = ul.component_id
WHERE ul.status = 'sold'
  AND ul.is_bundle = false
  AND ul.price > 0
  ${dateFilter}
GROUP BY ul.component_id, c.brand, c.name, ul.source
HAVING COUNT(*) >= ${MIN_SALES}
ORDER BY sold_count DESC
`

console.log(`\nAggregating market prices from sold listings...`)
console.log(`  Mode: ${execute ? 'EXECUTE' : 'DRY RUN (add --execute to write)'}`)
console.log(`  Date range: ${recentOnly ? `last ${RECENT_DAYS} days` : 'all time'}`)
console.log(`  Min sales threshold: ${MIN_SALES}\n`)

const rows = runSQL(aggregateSQL)

if (rows.length === 0 || (rows.length === 1 && rows[0].length < 4)) {
  console.log('No products meet the minimum sales threshold.')
  process.exit(0)
}

console.log(`Found ${rows.length} product-source combinations with ${MIN_SALES}+ sold listings:\n`)

// Preview
const preview = rows.slice(0, 20)
console.log('  Product                            Source          Sales  Min    Max    Median')
console.log('  ' + '-'.repeat(85))
for (const [compId, product, source, count, min, max, median] of preview) {
  console.log(`  ${product.padEnd(35)} ${source.padEnd(15)} ${count.padStart(5)}  $${min.padStart(5)} $${max.padStart(5)} $${median.padStart(5)}`)
}
if (rows.length > 20) {
  console.log(`  ... and ${rows.length - 20} more`)
}

if (!execute) {
  console.log(`\nDry run complete. Run with --execute to write to price_history.`)
  process.exit(0)
}

// Write to price_history — upsert by (component_id, source, date_recorded)
const today = new Date().toISOString().split('T')[0]
let inserted = 0
let updated = 0

for (const [compId, product, source, count, min, max, median] of rows) {
  const upsertSQL = `
    INSERT INTO price_history (component_id, source, date_recorded, price_min, price_max, price_avg, listing_count)
    VALUES ('${compId}', '${source}', '${today}', ${min}, ${max}, ${median}, ${count})
    ON CONFLICT (component_id, source, date_recorded)
    DO UPDATE SET price_min = ${min}, price_max = ${max}, price_avg = ${median}, listing_count = ${count}
    RETURNING (xmax = 0) as is_insert
  `
  try {
    const result = runSQL(upsertSQL)
    if (result[0] && result[0][0] === 't') {
      inserted++
    } else {
      updated++
    }
  } catch (err) {
    console.error(`  Failed for ${product} (${source}): ${err.message}`)
  }
}

console.log(`\nDone! ${inserted} inserted, ${updated} updated in price_history for date ${today}.`)

// Also update components.price_used_min and price_used_max with real data
console.log('\nUpdating components table with real median prices...')
const updateComponentsSQL = `
  UPDATE components c SET
    price_used_min = sub.p10,
    price_used_max = sub.p90
  FROM (
    SELECT
      component_id,
      ROUND(PERCENTILE_CONT(0.1) WITHIN GROUP (ORDER BY price)) as p10,
      ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY price)) as p90
    FROM used_listings
    WHERE status = 'sold' AND is_bundle = false AND price > 0
    GROUP BY component_id
    HAVING COUNT(*) >= ${MIN_SALES}
  ) sub
  WHERE c.id = sub.component_id
`
try {
  const result = execSync(
    `PGPASSWORD="${password}" psql "${dbUrl}" -c "${updateComponentsSQL.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8' }
  )
  const match = result.match(/UPDATE (\d+)/)
  if (match) {
    console.log(`Updated ${match[1]} components with real p10/p90 used price ranges.`)
  }
} catch (err) {
  console.error(`Failed to update components: ${err.message}`)
}
