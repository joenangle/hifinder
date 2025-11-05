require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkSignatures() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Check what sound_signature constraint allows
  const { data, error } = await supabase
    .from('components')
    .select('sound_signature')
    .not('sound_signature', 'is', null)
    .limit(300);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const unique = [...new Set(data.map(d => d.sound_signature))].sort();
  console.log('Currently allowed sound signatures in database:');
  unique.forEach(sig => console.log(`  - ${sig}`));
  console.log(`\nTotal unique: ${unique.length}`);
}

checkSignatures();
