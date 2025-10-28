const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyImportSuccess() {
  try {
    console.log('📊 VERIFYING CRINACLE IMPORT SUCCESS\n');
    console.log('═══════════════════════════════════════\n');

    // Get total count
    const { count: totalCount } = await supabase
      .from('components')
      .select('*', { count: 'exact', head: true });

    console.log(`📈 Total components in database: ${totalCount}`);
    console.log(`   Target: 555 (128 original + 427 new)`);

    if (totalCount === 555) {
      console.log('   ✅ Success! Target reached!\n');
    } else {
      console.log(`   ⚠️  Count mismatch: ${totalCount} vs expected 555\n`);
    }

    // Count by category
    const { data: categories } = await supabase
      .from('components')
      .select('category');

    const categoryCounts = {};
    categories.forEach(row => {
      categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1;
    });

    console.log('📦 Components by category:');
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      console.log(`   • ${cat}: ${count}`);
    });
    console.log('');

    // Count by source
    const { data: sources } = await supabase
      .from('components')
      .select('source');

    const sourceCounts = {};
    sources.forEach(row => {
      const source = row.source || 'original';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });

    console.log('📝 Components by source:');
    Object.entries(sourceCounts).forEach(([source, count]) => {
      console.log(`   • ${source}: ${count}`);
    });
    console.log('');

    // Count by budget tier
    const { data: tiers } = await supabase
      .from('components')
      .select('budget_tier');

    const tierCounts = {};
    tiers.forEach(row => {
      if (row.budget_tier) {
        tierCounts[row.budget_tier] = (tierCounts[row.budget_tier] || 0) + 1;
      }
    });

    console.log('💰 Components by budget tier:');
    const tierOrder = ['Budget', 'Entry Level', 'Mid Range', 'High End', 'Summit-Fi'];
    tierOrder.forEach(tier => {
      if (tierCounts[tier]) {
        console.log(`   • ${tier}: ${tierCounts[tier]}`);
      }
    });
    console.log('');

    // Check for specific Crinacle imports
    console.log('🔍 Checking specific Crinacle components:');

    const testComponents = [
      'Elysian Annihilator',
      'ThieAudio Monarch Mk2',
      'Sennheiser HE-1',
      'Hifiman Susvara'
    ];

    for (const name of testComponents) {
      const { data, error } = await supabase
        .from('components')
        .select('name, brand, price_new, budget_tier')
        .ilike('name', `%${name}%`)
        .limit(1)
        .single();

      if (data) {
        console.log(`   ✅ Found: ${data.brand} ${data.name} ($${data.price_new}, ${data.budget_tier})`);
      } else {
        console.log(`   ❌ Not found: ${name}`);
      }
    }

    console.log('\n═══════════════════════════════════════');

    if (totalCount >= 500) {
      console.log('🎉 IMPORT SUCCESSFUL! Database expanded with Crinacle data.');
    } else {
      console.log('⚠️  Import may be incomplete. Please check the import logs.');
    }

  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
}

verifyImportSuccess();