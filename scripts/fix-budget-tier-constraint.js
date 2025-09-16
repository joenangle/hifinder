const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBudgetTierConstraint() {
  try {
    console.log('🔧 Fixing budget_tier constraint...\n');

    console.log('📝 The import script generates these budget_tier values:');
    console.log('   • budget (≤$100)');
    console.log('   • entry ($100-400)');
    console.log('   • mid ($400-1000)');
    console.log('   • high (>$1000)');
    console.log('');

    console.log('🔨 To fix the constraint, run this SQL in your Supabase Dashboard:');
    console.log('   Dashboard → SQL Editor → Copy and paste this SQL:\n');

    console.log('-- Drop the existing constraint');
    console.log('ALTER TABLE components DROP CONSTRAINT IF EXISTS components_budget_tier_check;');
    console.log('');
    console.log('-- Add new constraint with correct values');
    console.log("ALTER TABLE components ADD CONSTRAINT components_budget_tier_check CHECK (budget_tier IN ('budget', 'entry', 'mid', 'high'));");
    console.log('');
    console.log('🎯 After running this SQL, the import should work without constraint violations.');

  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
}

fixBudgetTierConstraint();