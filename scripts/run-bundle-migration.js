/**
 * Run bundle columns migration
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🔧 Running bundle columns migration...\n');

  try {
    // Add is_bundle column
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE used_listings ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false`
    });
    if (error1) {
      console.log('Note: is_bundle column may already exist');
    } else {
      console.log('✅ Added is_bundle column');
    }

    // Add component_count column
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE used_listings ADD COLUMN IF NOT EXISTS component_count INTEGER DEFAULT 1`
    });
    if (error2) {
      console.log('Note: component_count column may already exist');
    } else {
      console.log('✅ Added component_count column');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNew columns added to used_listings table:');
    console.log('- is_bundle (BOOLEAN): Indicates if listing contains multiple components');
    console.log('- component_count (INTEGER): Number of components in the listing\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n⚠️  Manual migration required. Run this SQL in Supabase SQL Editor:');
    console.log(`
ALTER TABLE used_listings
  ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS component_count INTEGER DEFAULT 1;
`);
    process.exit(1);
  }
}

runMigration();
