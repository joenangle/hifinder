/**
 * Add price_is_estimated column to used_listings table
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🔧 Running price_is_estimated migration...\n');

  try {
    // Execute the ALTER TABLE command
    const { error } = await supabase
      .from('used_listings')
      .select('price_is_estimated')
      .limit(1);

    if (error && error.message.includes('column "price_is_estimated" does not exist')) {
      console.log('Column does not exist yet. Please run the migration manually.');
      console.log('\n⚠️  Manual migration required. Run this SQL in Supabase SQL Editor or via psql:');
      console.log(`
ALTER TABLE used_listings
  ADD COLUMN IF NOT EXISTS price_is_estimated BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN used_listings.price_is_estimated IS 'True when price was estimated from bundle total divided by component count';
`);
      process.exit(1);
    } else if (!error) {
      console.log('✅ Column price_is_estimated already exists');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nColumn in used_listings table:');
    console.log('- price_is_estimated (BOOLEAN): True when price was estimated from bundle total\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
