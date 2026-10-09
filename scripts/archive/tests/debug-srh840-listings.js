/**
 * Debug script to check actual used listings for Shure SRH840
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugSRH840() {
  console.log('🔍 Checking Shure SRH840 listings...\n');

  // First, get the component ID for Shure SRH840
  const { data: components, error: compError } = await supabase
    .from('components')
    .select('id, name, brand')
    .ilike('name', '%SRH840%')
    .eq('brand', 'Shure');

  if (compError) {
    console.error('❌ Error finding component:', compError);
    return;
  }

  if (!components || components.length === 0) {
    console.log('❌ Shure SRH840 not found in database');
    return;
  }

  const component = components[0];
  console.log('✅ Found component:', component);
  console.log('📋 Component ID:', component.id, '\n');

  // Get ALL listings for this component
  const { data: allListings, error: listError } = await supabase
    .from('used_listings')
    .select('*')
    .eq('component_id', component.id)
    .eq('is_active', true);

  if (listError) {
    console.error('❌ Error fetching listings:', listError);
    return;
  }

  console.log(`📦 Total active listings: ${allListings?.length || 0}\n`);

  if (allListings && allListings.length > 0) {
    console.log('📋 Listing details:\n');

    allListings.forEach((listing, i) => {
      const urlLower = (listing.url || '').toLowerCase();
      const titleLower = (listing.title || '').toLowerCase();
      const hasSample = urlLower.includes('sample') || titleLower.includes('sample');
      const hasDemo = urlLower.includes('demo') || titleLower.includes('demo');
      const wouldFilter = hasSample || hasDemo;

      console.log(`${i + 1}. ${listing.title}`);
      console.log(`   URL: ${listing.url}`);
      console.log(`   Source: ${listing.source}`);
      console.log(`   Price: $${listing.price}`);
      console.log(`   Posted: ${listing.date_posted}`);
      console.log(`   🚨 Would filter: ${wouldFilter ? 'YES' : 'NO'} ${hasSample ? '(has "sample")' : ''} ${hasDemo ? '(has "demo")' : ''}`);
      console.log('');
    });

    // Summary
    const filtered = allListings.filter(listing => {
      const urlLower = (listing.url || '').toLowerCase();
      const titleLower = (listing.title || '').toLowerCase();
      return !(
        urlLower.includes('sample') ||
        urlLower.includes('demo') ||
        titleLower.includes('sample') ||
        titleLower.includes('demo')
      );
    });

    console.log('\n📊 SUMMARY:');
    console.log(`   Total listings: ${allListings.length}`);
    console.log(`   After filter: ${filtered.length}`);
    console.log(`   Filtered out: ${allListings.length - filtered.length}`);
  }
}

debugSRH840();
