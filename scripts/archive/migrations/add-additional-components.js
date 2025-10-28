// Add additional DACs, amps, and combo units based on research
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Research-based additional components from trusted sources
const additionalComponents = [
  {
    name: 'Modi+',
    brand: 'Schiit',
    category: 'dac',
    price_used_min: 70,
    price_used_max: 90,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Excellent measurements per ASR, simple and reliable, great value for desktop setups'
  },
  {
    name: 'Magni Heresy',
    brand: 'Schiit',
    category: 'amp',
    price_used_min: 80,
    price_used_max: 110,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music', 'gaming'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'High power output ideal for planars, clean amplification, great for EQ headroom'
  },
  {
    name: 'Fulla E',
    brand: 'Schiit',
    category: 'dac_amp',
    price_used_min: 80,
    price_used_max: 120,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music', 'gaming', 'movies'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'All-in-one desktop solution, good power output, reliable build quality'
  },
  {
    name: 'Zen DAC V3',
    brand: 'iFi',
    category: 'dac_amp',
    price_used_min: 140,
    price_used_max: 180,
    budget_tier: 'entry',
    sound_signature: 'warm',
    use_cases: ['music', 'movies'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Award-winning design, XBass and XSpace features, premium build quality'
  },
  {
    name: 'Hip DAC',
    brand: 'iFi',
    category: 'dac_amp',
    price_used_min: 120,
    price_used_max: 160,
    budget_tier: 'entry',
    sound_signature: 'warm',
    use_cases: ['music', 'gaming'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Portable with balanced output, drives high-impedance headphones, good battery life'
  },
  {
    name: 'Nano iDSD Black Label',
    brand: 'iFi',
    category: 'dac_amp',
    price_used_min: 140,
    price_used_max: 190,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Portable powerhouse, IEMatch for sensitive IEMs, multiple filter options'
  },
  {
    name: 'Atom DAC+',
    brand: 'JDS Labs',
    category: 'dac',
    price_used_min: 70,
    price_used_max: 95,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Clean measurements, reliable performance, pairs well with Atom Amp+'
  },
  {
    name: 'Atom Amp+',
    brand: 'JDS Labs',
    category: 'amp',
    price_used_min: 75,
    price_used_max: 110,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music', 'gaming'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'High power output, transparent sound, excellent build quality for the price'
  },
  {
    name: 'Element III',
    brand: 'JDS Labs',
    category: 'dac_amp',
    price_used_min: 250,
    price_used_max: 320,
    budget_tier: 'mid',
    sound_signature: 'neutral',
    use_cases: ['music', 'gaming', 'movies'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'All-in-one solution, volume knob controls both DAC and amp, clean design'
  },
  {
    name: 'DX3 Pro+',
    brand: 'Topping',
    category: 'dac_amp',
    price_used_min: 140,
    price_used_max: 180,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music', 'gaming'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Excellent measurements, remote control, multiple inputs, great price-performance'
  },
  {
    name: 'A30 Pro',
    brand: 'Topping',
    category: 'amp',
    price_used_min: 120,
    price_used_max: 160,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'High power output, balanced and unbalanced outputs, clean amplification'
  },
  {
    name: 'K5 Pro ESS',
    brand: 'FiiO',
    category: 'dac_amp',
    price_used_min: 110,
    price_used_max: 150,
    budget_tier: 'entry',
    sound_signature: 'warm',
    use_cases: ['music', 'gaming', 'movies'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Great value, multiple inputs, good build quality, warmer than clinical alternatives'
  },
  {
    name: 'K7',
    brand: 'FiiO',
    category: 'dac_amp',
    price_used_min: 160,
    price_used_max: 210,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music', 'gaming', 'movies'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Balanced operation, high power, analog line input, improved over K5 Pro'
  },
  {
    name: 'BTR5',
    brand: 'FiiO',
    category: 'dac_amp',
    price_used_min: 80,
    price_used_max: 120,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music', 'gaming'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Portable Bluetooth DAC/amp, balanced output, good app support'
  },
  {
    name: 'Qudelix 5K',
    brand: 'Qudelix',
    category: 'dac_amp',
    price_used_min: 80,
    price_used_max: 110,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music', 'gaming'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Most configurable portable DAC/amp, extensive EQ options, Bluetooth with LDAC'
  },
  {
    name: 'Dawn Pro',
    brand: 'Moondrop',
    category: 'dac_amp',
    price_used_min: 35,
    price_used_max: 50,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Best budget dongle DAC, excellent build quality, transparent sound at low price'
  },
  {
    name: 'Atom Amp 2',
    brand: 'JDS Labs',
    category: 'amp',
    price_used_min: 100,
    price_used_max: 135,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music', 'gaming'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'All-metal construction, 4.4mm balanced output, high power for planars'
  },
  {
    name: 'Atom DAC 2',
    brand: 'JDS Labs',
    category: 'dac',
    price_used_min: 90,
    price_used_max: 120,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'USB-C input, upgradeable firmware, pairs perfectly with Atom Amp 2'
  },
  {
    name: 'D10s',
    brand: 'Topping',
    category: 'dac',
    price_used_min: 60,
    price_used_max: 85,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Compact size, good measurements, optical and USB inputs, budget-friendly'
  },
  {
    name: 'D70s',
    brand: 'Topping',
    category: 'dac',
    price_used_min: 280,
    price_used_max: 350,
    budget_tier: 'mid',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Flagship measurements, multiple inputs, balanced outputs, reference-grade performance'
  }
]

async function addAdditionalComponents() {
  console.log('🔧 Adding additional DACs, amps, and combo units...')
  
  try {
    // Insert components in batches
    const batchSize = 10
    for (let i = 0; i < additionalComponents.length; i += batchSize) {
      const batch = additionalComponents.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('components')
        .insert(batch)
        .select()
      
      if (error) {
        console.error(`❌ Error inserting batch ${i/batchSize + 1}:`, error)
      } else {
        console.log(`✅ Inserted batch ${i/batchSize + 1}: ${data.length} components`)
        data.forEach(comp => {
          console.log(`  ${comp.category}: ${comp.name} (${comp.brand}) - $${comp.price_used_min}`)
        })
      }
    }
    
    console.log('✅ Additional components added successfully!')
    
    // Show updated summary
    const { data: summary } = await supabase
      .from('components')
      .select('category')
    
    const categoryCounts = summary?.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      return acc
    }, {})
    
    console.log('📊 Updated database summary:', categoryCounts)
    
  } catch (err) {
    console.error('❌ Addition failed:', err)
  }
}

if (require.main === module) {
  addAdditionalComponents()
}

module.exports = { addAdditionalComponents }