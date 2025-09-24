/**
 * Add Essential Summit-Fi Components
 * High-end DACs, AMPs, and combos for complete ecosystem
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Essential high-end DACs
const highEndDacs = [
  // Chord Electronics - British Hi-Fi Legends
  {
    name: 'Hugo 2',
    brand: 'Chord Electronics',
    category: 'dac',
    price_new: 2595,
    price_used_min: 1800,
    price_used_max: 2200,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'studio_work'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Reference-grade portable DAC with exceptional detail retrieval and famous for its transparency',
    amazon_url: null
  },
  {
    name: 'Qutest',
    brand: 'Chord Electronics',
    category: 'dac',
    price_new: 1895,
    price_used_min: 1400,
    price_used_max: 1600,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'studio_work'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Desktop version of Hugo 2 technology, widely considered reference standard',
    amazon_url: null
  },
  {
    name: 'TT 2',
    brand: 'Chord Electronics',
    category: 'dac',
    price_new: 4995,
    price_used_min: 3800,
    price_used_max: 4300,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'studio_work'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Flagship DAC with unmatched resolution and detail, can drive headphones directly',
    amazon_url: null
  },

  // RME - German Engineering Excellence
  {
    name: 'ADI-2 DAC FS',
    brand: 'RME',
    category: 'dac',
    price_new: 1099,
    price_used_min: 850,
    price_used_max: 950,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'studio_work'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Studio-grade precision with parametric EQ, beloved by audio engineers',
    amazon_url: null
  },

  // Denafrips - R2R Ladder DACs
  {
    name: 'Pontus II',
    brand: 'Denafrips',
    category: 'dac',
    price_new: 1899,
    price_used_min: 1400,
    price_used_max: 1650,
    budget_tier: 'high',
    sound_signature: 'warm',
    use_cases: ['music_enjoyment', 'critical_listening'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'R2R ladder DAC with organic, musical presentation - audiophile favorite',
    amazon_url: null
  },
  {
    name: 'Venus II',
    brand: 'Denafrips',
    category: 'dac',
    price_new: 3299,
    price_used_min: 2500,
    price_used_max: 2900,
    budget_tier: 'high',
    sound_signature: 'warm',
    use_cases: ['music_enjoyment', 'critical_listening'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'High-end R2R with exceptional musicality and soundstage',
    amazon_url: null
  },

  // Topping - Measurement Kings
  {
    name: 'D90SE',
    brand: 'Topping',
    category: 'dac',
    price_new: 899,
    price_used_min: 650,
    price_used_max: 750,
    budget_tier: 'mid',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'studio_work'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'State-of-the-art measurements at reasonable price, ultra-clean sound',
    amazon_url: null
  },
  {
    name: 'D70 Pro Sabre',
    brand: 'Topping',
    category: 'dac',
    price_new: 599,
    price_used_min: 450,
    price_used_max: 525,
    budget_tier: 'mid',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'studio_work'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Excellent measurements and transparent sound at mid-tier price',
    amazon_url: null
  }
];

// Essential high-end AMPs
const highEndAmps = [
  // Schiit Audio - American Audio Engineering
  {
    name: 'Mjolnir 3',
    brand: 'Schiit',
    category: 'amp',
    price_new: 899,
    price_used_min: 650,
    price_used_max: 750,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'hard_to_drive_headphones'],
    impedance: null,
    needs_amp: false,
    power_output: '8W @ 32Ω',
    input_types: ['XLR', '1/4"'],
    output_types: ['XLR', '1/4"'],
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
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'hard_to_drive_headphones'],
    impedance: null,
    needs_amp: false,
    power_output: '15W @ 32Ω',
    input_types: ['XLR', '1/4"'],
    output_types: ['XLR', '1/4"', 'Speaker'],
    why_recommended: 'High-power integrated amp that doubles as speaker amp, drives anything',
    amazon_url: null
  },

  // Violectric - German Precision
  {
    name: 'V280',
    brand: 'Violectric',
    category: 'amp',
    price_new: 1899,
    price_used_min: 1400,
    price_used_max: 1650,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'hard_to_drive_headphones'],
    impedance: null,
    needs_amp: false,
    power_output: '3.6W @ 32Ω',
    input_types: ['XLR', '1/4"'],
    output_types: ['XLR', '1/4"'],
    why_recommended: 'Reference-grade German engineering, exceptional dynamics and control',
    amazon_url: null
  },
  {
    name: 'V590',
    brand: 'Violectric',
    category: 'amp',
    price_new: 3299,
    price_used_min: 2500,
    price_used_max: 2900,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'hard_to_drive_headphones'],
    impedance: null,
    needs_amp: false,
    power_output: '8W @ 32Ω',
    input_types: ['XLR', '1/4"'],
    output_types: ['XLR', '1/4"'],
    why_recommended: 'Flagship headphone amp with unmatched power and refinement',
    amazon_url: null
  },

  // Rupert Neve Designs - Legendary Console Designer
  {
    name: 'RNHP',
    brand: 'Rupert Neve Designs',
    category: 'amp',
    price_new: 499,
    price_used_min: 350,
    price_used_max: 425,
    budget_tier: 'mid',
    sound_signature: 'warm',
    use_cases: ['studio_work', 'music_enjoyment'],
    impedance: null,
    needs_amp: false,
    power_output: '1.4W @ 32Ω',
    input_types: ['1/4"', '3.5mm'],
    output_types: ['1/4"'],
    why_recommended: 'Legendary console designer\'s take on headphone amplification - musical and detailed',
    amazon_url: null
  },

  // HeadAmp - American Boutique
  {
    name: 'GS-X Mini',
    brand: 'HeadAmp',
    category: 'amp',
    price_new: 1299,
    price_used_min: 950,
    price_used_max: 1100,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'hard_to_drive_headphones'],
    impedance: null,
    needs_amp: false,
    power_output: '6W @ 32Ω',
    input_types: ['XLR', '1/4"'],
    output_types: ['XLR', '1/4"'],
    why_recommended: 'Boutique American amplifier with exceptional build quality and sound',
    amazon_url: null
  }
];

// Essential high-end DAC/AMP combos
const highEndCombos = [
  // RME - The Ultimate Combo
  {
    name: 'ADI-2 Pro FS R',
    brand: 'RME',
    category: 'dac_amp',
    price_new: 1699,
    price_used_min: 1300,
    price_used_max: 1500,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['studio_work', 'critical_listening'],
    impedance: null,
    needs_amp: false,
    power_output: '1.5W @ 32Ω',
    input_types: ['AES', 'SPDIF', 'USB', 'Analog'],
    output_types: ['XLR', '1/4"', 'SPDIF'],
    why_recommended: 'Professional studio unit with built-in EQ, analyzer, and pristine sound quality',
    amazon_url: null
  },

  // Chord Electronics - Portable Summit-Fi
  {
    name: 'Hugo TT 2',
    brand: 'Chord Electronics',
    category: 'dac_amp',
    price_new: 4995,
    price_used_min: 3800,
    price_used_max: 4300,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'hard_to_drive_headphones'],
    impedance: null,
    needs_amp: false,
    power_output: '7.5W @ 32Ω',
    input_types: ['USB', 'Optical', 'Coaxial'],
    output_types: ['XLR', '1/4"'],
    why_recommended: 'Flagship desktop DAC/amp with legendary Chord sound and massive power',
    amazon_url: null
  },

  // Benchmark - Studio Reference
  {
    name: 'HPA4',
    brand: 'Benchmark',
    category: 'amp',
    price_new: 2295,
    price_used_min: 1800,
    price_used_max: 2000,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['studio_work', 'critical_listening'],
    impedance: null,
    needs_amp: false,
    power_output: '4W @ 32Ω',
    input_types: ['XLR', '1/4"'],
    output_types: ['XLR', '1/4"'],
    why_recommended: 'Reference standard preamp/headphone amp used in professional studios worldwide',
    amazon_url: null
  },

  // Ferrum - Polish Innovation
  {
    name: 'OOR + HYPSOS',
    brand: 'Ferrum',
    category: 'amp',
    price_new: 2998,
    price_used_min: 2300,
    price_used_max: 2650,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'hard_to_drive_headphones'],
    impedance: null,
    needs_amp: false,
    power_output: '6.6W @ 32Ω',
    input_types: ['XLR', '1/4"'],
    output_types: ['XLR', '1/4"'],
    why_recommended: 'Flagship Polish amplifier with innovative design and exceptional dynamics',
    amazon_url: null
  },

  // Topping - Affordable Reference
  {
    name: 'A90 Discrete',
    brand: 'Topping',
    category: 'amp',
    price_new: 799,
    price_used_min: 600,
    price_used_max: 700,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'hard_to_drive_headphones'],
    impedance: null,
    needs_amp: false,
    power_output: '7.5W @ 32Ω',
    input_types: ['XLR', '1/4"'],
    output_types: ['XLR', '1/4"'],
    why_recommended: 'State-of-the-art measurements with discrete class-A design, incredible value',
    amazon_url: null
  },

  // Singxer - Chinese Hi-Fi
  {
    name: 'SA-1',
    brand: 'Singxer',
    category: 'amp',
    price_new: 699,
    price_used_min: 500,
    price_used_max: 600,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['critical_listening', 'hard_to_drive_headphones'],
    impedance: null,
    needs_amp: false,
    power_output: '9W @ 32Ω',
    input_types: ['XLR', '1/4"'],
    output_types: ['XLR', '1/4"'],
    why_recommended: 'Exceptional price-to-performance ratio with clean, powerful amplification',
    amazon_url: null
  }
];

/**
 * Add all high-end components to database
 */
async function addSummitFiComponents() {
  console.log('🚀 Adding Summit-Fi components to database...');

  try {
    // Add high-end DACs
    console.log(`📡 Adding ${highEndDacs.length} high-end DACs...`);
    for (const dac of highEndDacs) {
      const { data, error } = await supabase
        .from('components')
        .insert({
          ...dac,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error(`❌ Error adding ${dac.brand} ${dac.name}:`, error.message);
      } else {
        console.log(`✅ Added: ${dac.brand} ${dac.name} - $${dac.price_new}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Add high-end AMPs
    console.log(`\n🔊 Adding ${highEndAmps.length} high-end AMPs...`);
    for (const amp of highEndAmps) {
      const { data, error } = await supabase
        .from('components')
        .insert({
          ...amp,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error(`❌ Error adding ${amp.brand} ${amp.name}:`, error.message);
      } else {
        console.log(`✅ Added: ${amp.brand} ${amp.name} - $${amp.price_new}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Add high-end combos
    console.log(`\n🎛️ Adding ${highEndCombos.length} high-end combos...`);
    for (const combo of highEndCombos) {
      const { data, error } = await supabase
        .from('components')
        .insert({
          ...combo,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error(`❌ Error adding ${combo.brand} ${combo.name}:`, error.message);
      } else {
        console.log(`✅ Added: ${combo.brand} ${combo.name} - $${combo.price_new}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n🎉 Summit-Fi components added successfully!');
    console.log(`📊 Total added: ${highEndDacs.length + highEndAmps.length + highEndCombos.length} components`);
    console.log('💰 Price range: $499 - $4,995');

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