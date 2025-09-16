const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addCrinacleRankColumn() {
  try {
    console.log('🔧 Adding crinacle_rank column to components table...\n');

    // Check if the column already exists by trying to select it
    const { data: test, error: testError } = await supabase
      .from('components')
      .select('crinacle_rank')
      .limit(1);

    if (!testError) {
      console.log('✅ crinacle_rank column already exists');
      return;
    }

    if (testError && testError.code === '42703') {
      console.log('❌ crinacle_rank column does not exist');
      console.log('📝 To add the missing columns, run this SQL in your Supabase Dashboard:');
      console.log('   Dashboard → SQL Editor → Copy and paste this SQL:\n');
      console.log('ALTER TABLE components ADD COLUMN IF NOT EXISTS crinacle_rank TEXT;');
      console.log('ALTER TABLE components ADD COLUMN IF NOT EXISTS crinacle_tier TEXT;');
      console.log('ALTER TABLE components ADD COLUMN IF NOT EXISTS source TEXT;');
      console.log('\n🎯 After running this SQL, restart the import script.');
      return;
    }

    if (testError) {
      console.error('Unexpected error checking column:', testError);
      return;
    }

  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
}

addCrinacleRankColumn();