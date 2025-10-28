/**
 * Add Essential Summit-Fi Components (Schema Compatible)
 * Using existing components table schema
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Essential high-end components using correct schema
const summitFiComponents = [
  // HIGH-END DACS
  {
    name: 'Hugo 2',
    brand: 'Chord Electronics',
    category: 'dac',
    price_new: 2595,
    price_used_min: 1800,
    price_used_max: 2200,
    budget_tier: 'entry', // Will fix this constraint
    sound_signature: 'neutral',
    use_cases: ['critical_listening'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Reference-grade portable DAC with exceptional detail retrieval and famous transparency',
    amazon_url: null
  },
  {
    name: 'Qutest',
    brand: 'Chord Electronics',
    category: 'dac',
    price_new: 1895,
    price_used_min: 1400,
    price_used_max: 1600,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['critical_listening'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Desktop version of Hugo 2 technology, widely considered reference standard',
    amazon_url: null
  },
  {
    name: 'ADI-2 DAC FS',
    brand: 'RME',
    category: 'dac',
    price_new: 1099,
    price_used_min: 850,
    price_used_max: 950,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['critical_listening'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Studio-grade precision with parametric EQ, beloved by audio engineers',
    amazon_url: null
  },
  {
    name: 'Pontus II',
    brand: 'Denafrips',
    category: 'dac',
    price_new: 1899,
    price_used_min: 1400,
    price_used_max: 1650,
    budget_tier: 'entry',
    sound_signature: 'warm',
    use_cases: ['music_enjoyment'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'R2R ladder DAC with organic, musical presentation - audiophile favorite',
    amazon_url: null
  },
  {
    name: 'D90SE',
    brand: 'Topping',
    category: 'dac',
    price_new: 899,
    price_used_min: 650,
    price_used_max: 750,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['critical_listening'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'State-of-the-art measurements at reasonable price, ultra-clean sound',
    amazon_url: null
  },

  // HIGH-END AMPS
  {
    name: 'Mjolnir 3',
    brand: 'Schiit',
    category: 'amp',
    price_new: 899,
    price_used_min: 650,
    price_used_max: 750,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['critical_listening'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Hybrid tube/solid state amp with massive power for difficult headphones',
    amazon_url: null
  },
  {
    name: 'Ragnarok 2',
    brand: 'Schiit',
    category: 'amp',
    price_new: 1499,
    price_used_min: 1100,
    price_used_max: 1300,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['critical_listening'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'High-power integrated amp that doubles as speaker amp, drives anything',
    amazon_url: null
  },
  {
    name: 'V280',
    brand: 'Violectric',
    category: 'amp',
    price_new: 1899,
    price_used_min: 1400,
    price_used_max: 1650,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['critical_listening'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Reference-grade German engineering, exceptional dynamics and control',
    amazon_url: null
  },
  {
    name: 'RNHP',
    brand: 'Rupert Neve Designs',
    category: 'amp',
    price_new: 499,
    price_used_min: 350,
    price_used_max: 425,
    budget_tier: 'entry',
    sound_signature: 'warm',
    use_cases: ['music_enjoyment'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Legendary console designer\'s take on headphone amplification - musical and detailed',
    amazon_url: null
  },
  {
    name: 'A90 Discrete',
    brand: 'Topping',
    category: 'amp',
    price_new: 799,
    price_used_min: 600,
    price_used_max: 700,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['critical_listening'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'State-of-the-art measurements with discrete class-A design, incredible value',
    amazon_url: null
  },

  // HIGH-END DAC/AMP COMBOS
  {
    name: 'ADI-2 Pro FS R',
    brand: 'RME',
    category: 'dac_amp',
    price_new: 1699,
    price_used_min: 1300,
    price_used_max: 1500,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['critical_listening'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Professional studio unit with built-in EQ, analyzer, and pristine sound quality',
    amazon_url: null
  },
  {
    name: 'HPA4',
    brand: 'Benchmark',
    category: 'amp',
    price_new: 2295,
    price_used_min: 1800,
    price_used_max: 2000,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['critical_listening'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Reference standard preamp/headphone amp used in professional studios worldwide',
    amazon_url: null
  }
];

/**
 * Add Summit-Fi components with proper schema
 */
async function addSummitFiComponents() {
  console.log('🚀 Adding Summit-Fi components (schema compatible)...');

  try {
    let successCount = 0;
    let errorCount = 0;

    for (const component of summitFiComponents) {
      const { data, error } = await supabase
        .from('components')
        .insert({
          ...component,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error(`❌ Error adding ${component.brand} ${component.name}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Added: ${component.brand} ${component.name} ($${component.price_new})`);
        successCount++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n🎉 Summit-Fi addition completed!');
    console.log(`📊 Success: ${successCount}, Errors: ${errorCount}`);
    console.log('💰 Price range: $499 - $2,595');
    console.log('🎯 Categories: DACs, AMPs, DAC/AMP combos');

  } catch (error) {
    console.error('💥 Failed to add Summit-Fi components:', error);
  }
}

// Run if called directly
if (require.main === module) {
  addSummitFiComponents()
    .then(() => {
      console.log('✅ Summit-Fi addition completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Summit-Fi addition failed:', error);
      process.exit(1);
    });
}

module.exports = {
  addSummitFiComponents
};