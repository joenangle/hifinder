// Add high-tier IEMs for expert recommendations
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const highTierIEMs = [
  {
    name: 'U12t',
    brand: '64 Audio',
    category: 'iems',
    price_used_min: 1400,
    price_used_max: 1800,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 12,
    needs_amp: false,
    why_recommended: 'Flagship IEM with 12 balanced armature drivers, exceptional technical performance and build quality'
  },
  {
    name: 'Monarch Mk3',
    brand: 'Thieaudio',
    category: 'iems',
    price_used_min: 800,
    price_used_max: 1000,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 22,
    needs_amp: false,
    why_recommended: 'Hybrid driver IEM with excellent tuning, combining dynamic and balanced armature drivers'
  },
  {
    name: 'Z1R',
    brand: 'Sony',
    category: 'iems',
    price_used_min: 1200,
    price_used_max: 1500,
    budget_tier: 'high',
    sound_signature: 'fun',
    use_cases: ['music'],
    impedance: 40,
    needs_amp: false,
    why_recommended: 'Flagship dynamic driver IEM with exceptional bass extension and musical presentation'
  },
  {
    name: 'Variations',
    brand: 'Campfire Audio',
    category: 'iems',
    price_used_min: 600,
    price_used_max: 800,
    budget_tier: 'high',
    sound_signature: 'bright',
    use_cases: ['music'],
    impedance: 17,
    needs_amp: false,
    why_recommended: 'Premium IEM with unique beryllium drivers delivering exceptional detail and clarity'
  }
]

async function addHighTierIEMs() {
  console.log('🎵 Adding high-tier IEMs...')
  
  try {
    const { data, error } = await supabase
      .from('components')
      .insert(highTierIEMs)
      .select()
    
    if (error) {
      console.error('❌ Insert error:', error)
    } else {
      console.log(`✅ Added ${data.length} high-tier IEMs`)
      data.forEach(iem => {
        console.log(`  ${iem.name} (${iem.brand}) - $${iem.price_used_min}`)
      })
    }
  } catch (err) {
    console.error('❌ Failed:', err)
  }
}

if (require.main === module) {
  addHighTierIEMs()
}

module.exports = { addHighTierIEMs }