require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkMomentumScoring() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔍 Checking Sennheiser Momentum scoring...\n');

  // Check Momentum 3 data
  const { data: momentum, error } = await supabase
    .from('components')
    .select('id, brand, name, category, price_used_min, price_used_max, sound_signature, crin_rank, crin_tone, crin_tech, crin_value, crin_signature')
    .ilike('name', '%momentum%')
    .eq('category', 'cans');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Found', momentum.length, 'Momentum headphones:\n');
  momentum.forEach(m => {
    console.log(`${m.brand} ${m.name}:`);
    console.log(`  Price: $${m.price_used_min}-${m.price_used_max}`);
    console.log(`  Sound: ${m.sound_signature} | Crin Sig: ${m.crin_signature || 'N/A'}`);
    console.log(`  Rank: ${m.crin_rank || 'N/A'} | Tone: ${m.crin_tone || 'N/A'} | Tech: ${m.crin_tech || 'N/A'} | Value: ${m.crin_value || 'N/A'}`);
    console.log('');
  });

  // Check other $250 headphones with good scores
  console.log('\n🎧 Other headphones around $250 with Crinacle data:\n');
  const { data: competitors } = await supabase
    .from('components')
    .select('id, brand, name, price_used_min, price_used_max, sound_signature, crin_rank, crin_tone, crin_tech, crin_value')
    .eq('category', 'cans')
    .not('crin_rank', 'is', null)
    .gte('price_used_min', 150)
    .lte('price_used_max', 350)
    .order('crin_rank')
    .limit(10);

  competitors.forEach(c => {
    console.log(`${c.brand} ${c.name}: $${c.price_used_min}-${c.price_used_max}`);
    console.log(`  Rank: ${c.crin_rank} | Tone: ${c.crin_tone} | Tech: ${c.crin_tech} | Value: ${c.crin_value}`);
    console.log('');
  });

  // Check used listings table structure
  console.log('\n📦 Checking used_listings table columns:\n');
  const { data: columns } = await supabase
    .from('used_listings')
    .select('*')
    .limit(1);

  if (columns && columns.length > 0) {
    console.log('Available columns:', Object.keys(columns[0]).join(', '));
  }
}

checkMomentumScoring();
