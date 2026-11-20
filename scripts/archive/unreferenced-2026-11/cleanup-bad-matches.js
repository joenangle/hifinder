/**
 * Cleanup Script: Null out mismatched used_listings component_id assignments
 *
 * Problem: The V1/V2 Reddit scraper had loose matching that assigned listings
 * to wrong components (e.g., HD 600 listings matched to HE-1).
 *
 * Strategy: For each listing, verify that the listing title actually references
 * the matched component. If not, null out the component_id to prevent bad
 * price history data. Future scraper runs with V3 matcher will re-match correctly.
 *
 * Usage:
 *   node scripts/cleanup-bad-matches.js            # Dry run (preview)
 *   node scripts/cleanup-bad-matches.js --execute   # Apply fixes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXECUTE = process.argv.includes('--execute');

/**
 * Check if a listing title plausibly references the matched component.
 * Uses strict word-boundary matching to avoid false positives.
 */
function isTitlePlausibleMatch(title, brand, name) {
  const titleLower = title.toLowerCase();

  // Normalize: collapse hyphens to spaces, collapse multiple spaces
  const norm = (s) => s.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  const titleNorm = norm(title);
  const nameNorm = norm(name);

  // 1. Full normalized name found in title
  if (titleNorm.includes(nameNorm)) return true;

  // 2. Name with no spaces (e.g., "HD600" vs "HD 600")
  const nameCompact = nameNorm.replace(/\s/g, '');
  const titleCompact = titleNorm.replace(/\s/g, '');
  if (nameCompact.length >= 3 && titleCompact.includes(nameCompact)) return true;

  // 3. For model names with numbers, extract the number pattern and check
  // e.g., "HD 660S2" → look for "660s2" or "660 s2" in title
  const numMatch = nameNorm.match(/(\d{2,4}[a-z]*\d*)/);
  if (numMatch) {
    const modelNum = numMatch[1];
    // Must also have the brand present
    if (titleLower.includes(brand.toLowerCase()) && titleNorm.includes(modelNum)) {
      return true;
    }
  }

  return false;
}

async function main() {
  console.log(EXECUTE ? '🔧 EXECUTING fixes...\n' : '👀 DRY RUN — preview only\n');

  // Get all components
  const { data: components } = await supabase
    .from('components')
    .select('id, brand, name, price_new, category');

  const componentMap = new Map(components.map(c => [c.id, c]));

  // Get all listings (paginate if needed)
  let allListings = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data: page, error } = await supabase
      .from('used_listings')
      .select('id, component_id, title, price, status, source')
      .range(offset, offset + pageSize - 1)
      .order('created_at', { ascending: false });

    if (error) { console.error('Error fetching listings:', error); return; }
    if (!page || page.length === 0) break;
    allListings = allListings.concat(page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  console.log(`Total listings scanned: ${allListings.length}`);

  let badMatches = 0;
  let nulled = 0;
  const badByComponent = {};

  for (const listing of allListings) {
    if (!listing.component_id) continue;

    const component = componentMap.get(listing.component_id);
    if (!component) continue; // Orphan

    const isPlausible = isTitlePlausibleMatch(
      listing.title || '',
      component.brand,
      component.name
    );

    if (!isPlausible) {
      badMatches++;

      const key = `${component.brand} ${component.name}`;
      if (!badByComponent[key]) badByComponent[key] = { msrp: component.price_new, count: 0, samples: [] };
      badByComponent[key].count++;
      if (badByComponent[key].samples.length < 3) {
        badByComponent[key].samples.push(listing.title?.substring(0, 70));
      }

      if (EXECUTE) {
        const { error: updateError } = await supabase
          .from('used_listings')
          .update({ component_id: null })
          .eq('id', listing.id);

        if (updateError) {
          console.error(`  Error nulling ${listing.id}:`, updateError);
        } else {
          nulled++;
        }
      }
    }
  }

  console.log(`\nBad matches found: ${badMatches} / ${allListings.length} (${(badMatches / allListings.length * 100).toFixed(1)}%)`);

  console.log(`\nBad matches by component:`);
  const sorted = Object.entries(badByComponent).sort((a, b) => b[1].count - a[1].count);
  for (const [name, info] of sorted.slice(0, 20)) {
    console.log(`  ${name} (MSRP: $${info.msrp}): ${info.count} bad`);
    for (const sample of info.samples) {
      console.log(`    → "${sample}"`);
    }
  }
  if (sorted.length > 20) {
    console.log(`  ... and ${sorted.length - 20} more components with bad matches`);
  }

  if (EXECUTE) {
    console.log(`\n✅ Done! Nulled ${nulled} bad component_id assignments.`);
    console.log('These listings will be re-matched by the V3 scraper on the next run.');
  } else {
    console.log('\nRun with --execute to null out bad matches');
  }
}

main().catch(console.error);
