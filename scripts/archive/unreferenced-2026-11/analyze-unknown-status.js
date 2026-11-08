#!/usr/bin/env node
/**
 * Analyze Unknown Status Listings
 *
 * Investigates the 781 listings with status=NULL to determine:
 * - Age distribution (<7 days, 7-30 days, >30 days, >90 days)
 * - Source breakdown (reddit, reverb, etc.)
 * - Component match validity
 * - Recommendation: mark as 'expired' or delete
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeUnknownStatus() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   UNKNOWN STATUS ANALYSIS                  ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Fetch all listings with NULL status
  const { data: listings, error } = await supabase
    .from('used_listings')
    .select('*')
    .is('status', null);

  if (error) {
    console.error('❌ Error fetching listings:', error.message);
    process.exit(1);
  }

  console.log(`📊 Found ${listings.length} listings with NULL status\n`);

  if (listings.length === 0) {
    console.log('✅ No listings with unknown status. All clear!\n');
    return;
  }

  // Age distribution
  const now = new Date();
  const ageBuckets = {
    '0-7 days': 0,
    '7-30 days': 0,
    '30-90 days': 0,
    '>90 days': 0
  };

  // Source distribution
  const sourceCounts = {};

  // Component match validity
  let withComponent = 0;
  let withoutComponent = 0;

  for (const listing of listings) {
    // Age analysis
    const createdAt = new Date(listing.created_at);
    const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);

    if (ageInDays <= 7) {
      ageBuckets['0-7 days']++;
    } else if (ageInDays <= 30) {
      ageBuckets['7-30 days']++;
    } else if (ageInDays <= 90) {
      ageBuckets['30-90 days']++;
    } else {
      ageBuckets['>90 days']++;
    }

    // Source analysis
    const source = listing.source || 'unknown';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;

    // Component validity
    if (listing.component_id) {
      withComponent++;
    } else {
      withoutComponent++;
    }
  }

  // Print results
  console.log('═'.repeat(60));
  console.log('AGE DISTRIBUTION');
  console.log('═'.repeat(60) + '\n');

  Object.entries(ageBuckets).forEach(([range, count]) => {
    const percentage = ((count / listings.length) * 100).toFixed(1);
    console.log(`${range.padEnd(15)} ${count.toString().padStart(5)} (${percentage}%)`);
  });

  console.log('\n' + '═'.repeat(60));
  console.log('SOURCE DISTRIBUTION');
  console.log('═'.repeat(60) + '\n');

  Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      const percentage = ((count / listings.length) * 100).toFixed(1);
      console.log(`${source.padEnd(20)} ${count.toString().padStart(5)} (${percentage}%)`);
    });

  console.log('\n' + '═'.repeat(60));
  console.log('COMPONENT MATCH VALIDITY');
  console.log('═'.repeat(60) + '\n');

  console.log(`With component:    ${withComponent} (${((withComponent / listings.length) * 100).toFixed(1)}%)`);
  console.log(`Without component: ${withoutComponent} (${((withoutComponent / listings.length) * 100).toFixed(1)}%)`);

  console.log('\n' + '═'.repeat(60));
  console.log('RECOMMENDATIONS');
  console.log('═'.repeat(60) + '\n');

  // Calculate recommendations
  const markAsExpired = ageBuckets['30-90 days'];
  const shouldDelete = ageBuckets['>90 days'] + withoutComponent;
  const investigate = ageBuckets['0-7 days'] + ageBuckets['7-30 days'];

  console.log('✅ Mark as EXPIRED:');
  console.log(`   ${markAsExpired} listings (30-90 days old)`);
  console.log(`   SQL: UPDATE used_listings SET status='expired'`);
  console.log(`        WHERE status IS NULL AND created_at < NOW() - INTERVAL '30 days'`);
  console.log(`        AND created_at >= NOW() - INTERVAL '90 days';`);
  console.log('');

  console.log('🗑️  DELETE:');
  console.log(`   ${ageBuckets['>90 days']} listings (>90 days old)`);
  console.log(`   ${withoutComponent} listings (no component match)`);
  console.log(`   SQL: DELETE FROM used_listings`);
  console.log(`        WHERE status IS NULL AND (`);
  console.log(`          created_at < NOW() - INTERVAL '90 days'`);
  console.log(`          OR component_id IS NULL`);
  console.log(`        );`);
  console.log('');

  console.log('🔍 INVESTIGATE MANUALLY:');
  console.log(`   ${investigate} listings (<30 days old)`);
  console.log(`   These are relatively fresh - may need manual review`);
  console.log('');

  // Summary stats
  console.log('═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60) + '\n');

  console.log(`Total NULL status:  ${listings.length}`);
  console.log(`Mark as expired:    ${markAsExpired} (${((markAsExpired / listings.length) * 100).toFixed(1)}%)`);
  console.log(`Delete:             ${shouldDelete} (${((shouldDelete / listings.length) * 100).toFixed(1)}%)`);
  console.log(`Investigate:        ${investigate} (${((investigate / listings.length) * 100).toFixed(1)}%)`);
  console.log('');

  // Breakdown by source for expired/delete
  console.log('Source breakdown for >30 day old listings:');
  const oldListings = listings.filter(l => {
    const ageInDays = (now - new Date(l.created_at)) / (1000 * 60 * 60 * 24);
    return ageInDays > 30;
  });

  const oldSourceCounts = {};
  for (const listing of oldListings) {
    const source = listing.source || 'unknown';
    oldSourceCounts[source] = (oldSourceCounts[source] || 0) + 1;
  }

  Object.entries(oldSourceCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      console.log(`  ${source.padEnd(20)} ${count}`);
    });

  console.log('\n');
}

// Run analysis
analyzeUnknownStatus().catch(error => {
  console.error('Analysis failed:', error);
  process.exit(1);
});
