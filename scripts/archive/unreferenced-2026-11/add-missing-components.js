/**
 * Add Missing Components to Database
 *
 * Components identified from Phase 2 test that returned NULL
 * because they don't exist in the database
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MISSING_COMPONENTS = [
  {
    brand: 'Audio Technica',
    name: 'ATH-M60x',
    category: 'cans', // Fixed: was 'headphones'
    price_new: 239,
    price_used_min: 150,
    price_used_max: 190,
    sound_signature: 'neutral',
    driver_type: 'dynamic',
    impedance: 38, // Integer, not float
    needs_amp: false
  },
  {
    brand: 'SMSL',
    name: 'RAW-MDA 1',
    category: 'dac',
    price_new: 199,
    price_used_min: 135,
    price_used_max: 165,
    sound_signature: 'neutral'
  },
  {
    brand: 'qdc',
    name: 'Anole VX',
    category: 'iems',
    price_new: 1899,
    price_used_min: 1200,
    price_used_max: 1500,
    sound_signature: 'neutral',
    driver_type: 'hybrid',
    impedance: 18, // Integer, not float
    needs_amp: false
  },
  {
    brand: 'Thieaudio',
    name: 'Ghost',
    category: 'iems',
    price_new: 149,
    price_used_min: 95,
    price_used_max: 120,
    sound_signature: 'neutral',
    driver_type: 'planar',
    impedance: 15, // Fixed: rounded from 14.8
    needs_amp: false
  },
  {
    brand: 'AKG',
    name: 'K240 MKII',
    category: 'cans', // Fixed: was 'headphones'
    price_new: 69,
    price_used_min: 40,
    price_used_max: 55,
    sound_signature: 'neutral',
    driver_type: 'dynamic',
    impedance: 55,
    needs_amp: false
  },
  {
    brand: '64 Audio',
    name: 'U4S',
    category: 'iems',
    price_new: 899,
    price_used_min: 550,
    price_used_max: 700,
    sound_signature: 'warm',
    driver_type: 'balanced armature',
    impedance: 13, // Fixed: rounded from 12.5
    needs_amp: false
  },
  {
    brand: 'Abyss',
    name: 'Diana V2',
    category: 'cans', // Fixed: was 'headphones'
    price_new: 3195,
    price_used_min: 2000,
    price_used_max: 2500,
    sound_signature: 'neutral',
    driver_type: 'planar magnetic',
    impedance: 42,
    needs_amp: true
  },
  {
    brand: 'MuseHiFi',
    name: 'M5 Ultra',
    category: 'dac',
    price_new: 379,
    price_used_min: 240,
    price_used_max: 300,
    sound_signature: 'neutral'
  },
  {
    brand: 'FiiO',
    name: 'M11 Plus ESS',
    category: 'dac',
    price_new: 699,
    price_used_min: 420,
    price_used_max: 550,
    sound_signature: 'neutral'
  },
  {
    brand: 'Timsok',
    name: 'TS-316',
    category: 'iems',
    price_new: 49,
    price_used_min: 30,
    price_used_max: 40,
    sound_signature: 'warm',
    driver_type: 'dynamic',
    impedance: 16,
    needs_amp: false
  }
];

async function addMissingComponents() {
  console.log('📦 Adding missing components to database...\n');

  let added = 0;
  let skipped = 0;
  let errors = 0;

  for (const component of MISSING_COMPONENTS) {
    try {
      // Check if component already exists
      const { data: existing, error: checkError } = await supabase
        .from('components')
        .select('id, brand, name')
        .eq('brand', component.brand)
        .eq('name', component.name)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows
        throw checkError;
      }

      if (existing) {
        console.log(`⏭️  Skipped: ${component.brand} ${component.name} (already exists)`);
        skipped++;
        continue;
      }

      // Insert new component
      const { data, error } = await supabase
        .from('components')
        .insert(component)
        .select();

      if (error) throw error;

      console.log(`✅ Added: ${component.brand} ${component.name} (${component.category}, $${component.price_new})`);
      added++;

    } catch (error) {
      console.error(`❌ Error adding ${component.brand} ${component.name}:`, error.message);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Added: ${added}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log('='.repeat(60));

  // Verify database state
  console.log('\n📈 Component counts by category:');
  const { data: counts, error: countError } = await supabase
    .from('components')
    .select('category')
    .in('brand', MISSING_COMPONENTS.map(c => c.brand));

  if (!countError && counts) {
    const categoryCounts = counts.reduce((acc, row) => {
      acc[row.category] = (acc[row.category] || 0) + 1;
      return acc;
    }, {});

    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`);
    });
  }

  console.log('\n✅ Done! Missing components have been added to the database.');
}

addMissingComponents().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
