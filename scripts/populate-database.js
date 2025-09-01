// Database population script for HiFinder
// Adds well-known components from trusted audio sources

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role for bulk operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Curated component data from trusted sources (compatible with existing schema)
const knownComponents = [
  // Popular Cans (Over/On-Ear)
  {
    name: 'HD 600',
    brand: 'Sennheiser',
    category: 'cans',
    price_used_min: 250,
    price_used_max: 300,
    budget_tier: 'mid',
    sound_signature: 'neutral',
    use_cases: ['music', 'mixing'],
    impedance: 300,
    needs_amp: true,
    why_recommended: 'Industry standard reference headphone with exceptional midrange clarity and natural tonality'
  },
  {
    name: 'HD 650',
    brand: 'Sennheiser', 
    category: 'cans',
    price_used_min: 280,
    price_used_max: 350,
    budget_tier: 'mid',
    sound_signature: 'warm',
    use_cases: ['music'],
    impedance: 300,
    needs_amp: true,
    why_recommended: 'Warm, musical sound with excellent build quality and comfort for long listening sessions'
  },
  {
    name: 'DT 990 Pro',
    brand: 'Beyerdynamic',
    category: 'cans',
    price_used_min: 120,
    price_used_max: 160,
    budget_tier: 'entry',
    sound_signature: 'bright',
    use_cases: ['gaming', 'music'],
    impedance: 250,
    needs_amp: true,
    why_recommended: 'V-shaped sound signature ideal for gaming with excellent imaging and detail retrieval'
  },
  {
    name: 'Edition XS',
    brand: 'Hifiman',
    category: 'cans',
    price_used_min: 350,
    price_used_max: 450,
    budget_tier: 'mid',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 18,
    needs_amp: false,
    why_recommended: 'Planar magnetic driver with exceptional detail and wide soundstage, easy to drive'
  },

  // Popular IEMs 
  {
    name: 'Blessing 2',
    brand: 'Moondrop',
    category: 'iems',
    price_used_min: 280,
    price_used_max: 350,
    budget_tier: 'mid',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 22,
    needs_amp: false,
    why_recommended: 'Harman-tuned IEM with excellent technical performance and build quality'
  },
  {
    name: 'Aria',
    brand: 'Moondrop',
    category: 'iems',
    price_used_min: 60,
    price_used_max: 80,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Entry-level IEM with mature Harman tuning and excellent value proposition'
  },
  {
    name: 'Chu',
    brand: 'Moondrop',
    category: 'iems',
    price_used_min: 15,
    price_used_max: 25,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Ultra-budget IEM with surprisingly good tuning and build quality'
  },

  // DACs (using existing schema fields only)
  {
    name: 'Modi 3E',
    brand: 'Schiit',
    category: 'dac',
    price_used_min: 80,
    price_used_max: 120,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Clean, affordable DAC with excellent measurements and build quality'
  },
  {
    name: 'Modius',
    brand: 'Schiit',
    category: 'dac',
    price_used_min: 160,
    price_used_max: 200,
    budget_tier: 'mid',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Balanced DAC with multiple inputs and excellent performance metrics'
  },

  // Amps (using existing schema fields only)
  {
    name: 'Magni 3+',
    brand: 'Schiit',
    category: 'amp',
    price_used_min: 80,
    price_used_max: 120,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'High-power headphone amplifier capable of driving most headphones with low noise'
  },
  {
    name: 'Magnius',
    brand: 'Schiit',
    category: 'amp',
    price_used_min: 160,
    price_used_max: 200,
    budget_tier: 'mid',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Balanced headphone amplifier with high power output for demanding headphones'
  },

  // Combo Units  
  {
    name: 'Fulla 4',
    brand: 'Schiit',
    category: 'dac_amp',
    price_used_min: 80,
    price_used_max: 120,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music', 'gaming'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'All-in-one USB DAC/amp perfect for desktop setups with good power output'
  },
  {
    name: 'Zen DAC V2',
    brand: 'iFi',
    category: 'dac_amp',
    price_used_min: 120,
    price_used_max: 160,
    budget_tier: 'entry',
    sound_signature: 'warm',
    use_cases: ['music'],
    impedance: null,
    needs_amp: false,
    why_recommended: 'Feature-rich DAC/amp with bass boost, 3D sound processing, and high power output'
  }
]

async function populateDatabase() {
  console.log('Starting database population...')
  
  try {
    // Insert components in batches to avoid rate limits
    const batchSize = 10
    for (let i = 0; i < knownComponents.length; i += batchSize) {
      const batch = knownComponents.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('components')
        .insert(batch)
        .select()
      
      if (error) {
        console.error(`Error inserting batch ${i/batchSize + 1}:`, error)
      } else {
        console.log(`✅ Inserted batch ${i/batchSize + 1}: ${data.length} components`)
      }
    }
    
    console.log('✅ Database population complete!')
    
    // Show summary
    const { data: summary } = await supabase
      .from('components')
      .select('category')
    
    const categoryCounts = summary?.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      return acc
    }, {})
    
    console.log('📊 Database summary:', categoryCounts)
    
  } catch (err) {
    console.error('❌ Population failed:', err)
  }
}

if (require.main === module) {
  populateDatabase()
}

module.exports = { populateDatabase, knownComponents }