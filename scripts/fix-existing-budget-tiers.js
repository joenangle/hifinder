const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixExistingBudgetTiers() {
  try {
    console.log('🔧 Updating existing budget_tier values to match UI slider...\n');

    // First, let's see what values currently exist
    console.log('📊 Checking current budget_tier values...');
    const { data: existingTiers } = await supabase
      .from('components')
      .select('budget_tier')
      .not('budget_tier', 'is', null);

    const tierCounts = {};
    existingTiers.forEach(row => {
      tierCounts[row.budget_tier] = (tierCounts[row.budget_tier] || 0) + 1;
    });

    console.log('Current budget_tier distribution:');
    Object.entries(tierCounts).forEach(([tier, count]) => {
      console.log(`   • "${tier}": ${count} components`);
    });
    console.log('');

    console.log('🔄 Updating budget_tier values to match UI slider format...');

    // Update each tier to the correct format
    const updates = [
      { from: 'budget', to: 'Budget' },
      { from: 'entry', to: 'Entry Level' },
      { from: 'mid', to: 'Mid Range' },
      { from: 'high', to: 'High End' },
      { from: 'summit', to: 'Summit-Fi' },
      { from: 'summit-fi', to: 'Summit-Fi' }
    ];

    for (const update of updates) {
      const { data, error } = await supabase
        .from('components')
        .update({ budget_tier: update.to })
        .eq('budget_tier', update.from)
        .select('id');

      if (error) {
        console.error(`Error updating ${update.from} to ${update.to}:`, error);
      } else {
        console.log(`✅ Updated ${data.length} components from "${update.from}" to "${update.to}"`);
      }
    }

    console.log('\n🔧 Now run this SQL in your Supabase Dashboard:');
    console.log('   Dashboard → SQL Editor → Copy and paste this SQL:\n');

    console.log('-- Drop the existing constraint');
    console.log('ALTER TABLE components DROP CONSTRAINT IF EXISTS components_budget_tier_check;');
    console.log('');
    console.log('-- Add new constraint with exact UI slider values');
    console.log("ALTER TABLE components ADD CONSTRAINT components_budget_tier_check CHECK (budget_tier IN ('Budget', 'Entry Level', 'Mid Range', 'High End', 'Summit-Fi'));");
    console.log('');
    console.log('🎯 After running this SQL, the imports should work without constraint violations.');

  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
}

fixExistingBudgetTiers();