const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('🔍 ANALYZING SOUND SIGNATURES IN DATABASE...\n');

  // Get all unique sound signatures by category
  const { data: signatures } = await supabase
    .from('components')
    .select('category, sound_signature')
    .not('sound_signature', 'is', null);

  if (!signatures) {
    console.log('❌ No data found');
    return;
  }

  // Group by category
  const byCategory = {};
  signatures.forEach(item => {
    if (!byCategory[item.category]) byCategory[item.category] = new Set();
    if (item.sound_signature) byCategory[item.category].add(item.sound_signature.toLowerCase());
  });

  console.log('📊 SOUND SIGNATURES BY CATEGORY:');
  console.log('═══════════════════════════════════════\n');

  Object.entries(byCategory).forEach(([category, sigs]) => {
    console.log(`${category.toUpperCase()} (${sigs.size} unique signatures):`);
    [...sigs].sort().forEach(sig => console.log(`  • ${sig}`));
    console.log('');
  });

  // Check counts per category
  const { data: counts } = await supabase
    .from('components')
    .select('category, sound_signature')
    .not('sound_signature', 'is', null);

  const categoryCounts = {};
  counts.forEach(item => {
    if (!categoryCounts[item.category]) categoryCounts[item.category] = {};
    const sig = item.sound_signature?.toLowerCase() || 'unknown';
    categoryCounts[item.category][sig] = (categoryCounts[item.category][sig] || 0) + 1;
  });

  console.log('📈 COUNTS BY SIGNATURE:');
  console.log('═══════════════════════════════════════\n');

  Object.entries(categoryCounts).forEach(([category, sigs]) => {
    console.log(`${category.toUpperCase()}:`);
    Object.entries(sigs).sort((a,b) => b[1] - a[1]).forEach(([sig, count]) => {
      console.log(`  ${sig.padEnd(15)} ${count} items`);
    });
    console.log('');
  });

  // Also check the UI options
  console.log('🎯 CURRENT UI OPTIONS:');
  console.log('═══════════════════════════════════════\n');
  const uiOptions = [
    'any',
    'neutral',
    'warm',
    'bright',
    'fun'
  ];

  console.log('UI Sound Signature Options:');
  uiOptions.forEach(option => console.log(`  • ${option}`));
  console.log('');

  // Check alignment
  console.log('🔗 ALIGNMENT ANALYSIS:');
  console.log('═══════════════════════════════════════\n');

  const allDbSignatures = new Set();
  Object.values(byCategory).forEach(sigs => {
    sigs.forEach(sig => allDbSignatures.add(sig));
  });

  const dbSigs = [...allDbSignatures].sort();
  console.log('All DB signatures:', dbSigs.join(', '));
  console.log('UI options:', uiOptions.join(', '));

  // Check which DB signatures don't map to UI options
  const unmapped = dbSigs.filter(sig => !uiOptions.includes(sig) && sig !== 'neutral' && sig !== 'warm' && sig !== 'bright' && sig !== 'fun');
  if (unmapped.length > 0) {
    console.log('\n⚠️  Unmapped DB signatures:', unmapped.join(', '));
  }
})();