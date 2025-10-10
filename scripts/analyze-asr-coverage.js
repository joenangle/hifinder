require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('📊 Analyzing ASR data coverage and potential...\n');

  // Get all DAC/amp components
  const { data: allComponents } = await supabase
    .from('components')
    .select('id, brand, name, category, price_new, asr_sinad, asr_review_url, source')
    .in('category', ['dac', 'amp', 'dac_amp']);

  // Group by category
  const byCategory = {
    dac: allComponents.filter(c => c.category === 'dac'),
    amp: allComponents.filter(c => c.category === 'amp'),
    dac_amp: allComponents.filter(c => c.category === 'dac_amp')
  };

  // Analyze ASR coverage
  Object.keys(byCategory).forEach(cat => {
    const components = byCategory[cat];
    const withSinad = components.filter(c => c.asr_sinad !== null);
    const withReviewUrl = components.filter(c => c.asr_review_url !== null);

    console.log(`${cat.toUpperCase()}:`);
    console.log(`  Total: ${components.length}`);
    console.log(`  With SINAD: ${withSinad.length} (${Math.round(withSinad.length/components.length*100)}%)`);
    console.log(`  With ASR Review: ${withReviewUrl.length} (${Math.round(withReviewUrl.length/components.length*100)}%)`);

    if (withSinad.length > 0) {
      const sinads = withSinad.map(c => c.asr_sinad).sort((a,b) => b-a);
      console.log(`  SINAD range: ${Math.min(...sinads)} - ${Math.max(...sinads)} dB`);
      console.log(`  Top 3: ${sinads.slice(0,3).join(', ')} dB`);
    }
    console.log('');
  });

  // Show examples with and without ASR data
  console.log('Sample components WITH ASR data:');
  allComponents
    .filter(c => c.asr_sinad && c.asr_sinad > 115)
    .slice(0, 5)
    .forEach(c => {
      console.log(`  ${c.brand} ${c.name} (${c.category}): ${c.asr_sinad} dB SINAD - $${c.price_new}`);
    });

  console.log('\nSample components WITHOUT ASR data:');
  allComponents
    .filter(c => !c.asr_sinad && c.price_new > 400)
    .slice(0, 5)
    .forEach(c => {
      console.log(`  ${c.brand} ${c.name} (${c.category}): No SINAD - $${c.price_new}`);
    });

})();
