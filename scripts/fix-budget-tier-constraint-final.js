const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixBudgetTierConstraintFinal() {
  try {
    console.log('🔧 Fixing budget_tier constraint to match import script output...\n');

    console.log('📊 Current import script generates these exact values:');
    console.log('   • "budget" (≤$100)');
    console.log('   • "entry" ($100-400)');
    console.log('   • "mid" ($400-1000)');
    console.log('   • "high" ($1000+)');
    console.log('');

    console.log('🔨 Run this SQL in your Supabase Dashboard:');
    console.log('   Dashboard → SQL Editor → Copy and paste this SQL:\n');

    console.log('-- Drop the existing constraint');
    console.log('ALTER TABLE components DROP CONSTRAINT IF EXISTS components_budget_tier_check;');
    console.log('');
    console.log('-- Add new constraint with exact import script values');
    console.log("ALTER TABLE components ADD CONSTRAINT components_budget_tier_check CHECK (budget_tier IN ('budget', 'entry', 'mid', 'high'));");
    console.log('');
    console.log('🎯 This matches exactly what the import script is generating.');

  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
}

fixBudgetTierConstraintFinal();