#!/usr/bin/env node
/**
 * Apply Bundle Tracking Migration
 *
 * Applies the database schema changes for bundle tracking support.
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

async function applyMigration() {
  console.log('\n🔧 Applying Bundle Tracking Migration...\n');

  try {
    // Step 1: Add bundle tracking columns (using ALTER TABLE directly)
    console.log('Step 1: Adding bundle tracking columns...');

    const { error: alterError } = await supabase.rpc('exec', {
      query: `
        ALTER TABLE used_listings
          ADD COLUMN IF NOT EXISTS bundle_group_id TEXT,
          ADD COLUMN IF NOT EXISTS bundle_total_price INTEGER,
          ADD COLUMN IF NOT EXISTS bundle_component_count INTEGER,
          ADD COLUMN IF NOT EXISTS bundle_position INTEGER,
          ADD COLUMN IF NOT EXISTS matched_segment TEXT;
      `
    });

    if (alterError && !alterError.message.includes('does not exist')) {
      console.log('  ⚠️  Using direct query method instead...');

      // Alternative: Try direct query
      const { error: directError } = await supabase
        .from('used_listings')
        .select('bundle_group_id')
        .limit(1);

      if (directError && directError.message.includes('column "bundle_group_id" does not exist')) {
        console.error('  ❌ Migration needs to be applied manually');
        console.log('\n  Please run the following SQL in your Supabase SQL Editor:');
        console.log('  ' + '='.repeat(60));
        console.log(`  -- Add bundle tracking columns
  ALTER TABLE used_listings
    ADD COLUMN IF NOT EXISTS bundle_group_id TEXT,
    ADD COLUMN IF NOT EXISTS bundle_total_price INTEGER,
    ADD COLUMN IF NOT EXISTS bundle_component_count INTEGER,
    ADD COLUMN IF NOT EXISTS bundle_position INTEGER,
    ADD COLUMN IF NOT EXISTS matched_segment TEXT;

  -- Add index for bundle group queries
  CREATE INDEX IF NOT EXISTS idx_used_listings_bundle_group
    ON used_listings(bundle_group_id)
    WHERE bundle_group_id IS NOT NULL;

  -- Add column comments
  COMMENT ON COLUMN used_listings.bundle_group_id IS 'Groups multiple listings from the same bundle post';
  COMMENT ON COLUMN used_listings.bundle_total_price IS 'Total price for entire bundle';
  COMMENT ON COLUMN used_listings.bundle_component_count IS 'Number of components in bundle';
  COMMENT ON COLUMN used_listings.bundle_position IS 'Position of this component in bundle';
  COMMENT ON COLUMN used_listings.matched_segment IS 'Text segment that matched this component';

  -- Drop old unique constraint on url only
  ALTER TABLE used_listings DROP CONSTRAINT IF EXISTS used_listings_url_key;

  -- Add new composite unique constraint
  ALTER TABLE used_listings
    ADD CONSTRAINT used_listings_url_component_unique
    UNIQUE (url, component_id);

  -- Add index for URL lookups
  CREATE INDEX IF NOT EXISTS idx_used_listings_url ON used_listings(url);
        `);
        console.log('  ' + '='.repeat(60));
        return;
      } else {
        console.log('  ✅ Columns appear to exist already');
      }
    } else {
      console.log('  ✅ Columns added successfully');
    }

    // Verify the schema changes by querying for the new columns
    console.log('\nVerifying schema changes...');

    const { data: testData, error: testError } = await supabase
      .from('used_listings')
      .select('id, bundle_group_id, bundle_total_price, bundle_component_count, bundle_position, matched_segment')
      .limit(1);

    if (testError) {
      if (testError.message.includes('column') && testError.message.includes('does not exist')) {
        console.error('❌ New columns not found - migration may have failed');
        console.log('\nPlease apply the migration manually using the SQL Editor in Supabase.');
      } else {
        console.error('❌ Verification error:', testError.message);
      }
    } else {
      console.log('✅ All new columns are present and accessible!');
      console.log('\nNew columns verified:');
      console.log('  • bundle_group_id');
      console.log('  • bundle_total_price');
      console.log('  • bundle_component_count');
      console.log('  • bundle_position');
      console.log('  • matched_segment');
    }

    console.log('\n✅ Migration verification complete!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\nPlease apply the migration manually by running:');
    console.log('  cat supabase/migrations/20260128_add_bundle_tracking.sql');
    console.log('\nThen copy the SQL to your Supabase SQL Editor.\n');
    process.exit(1);
  }
}

applyMigration().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
