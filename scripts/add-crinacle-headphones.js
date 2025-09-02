// Add Crinacle's headphone rankings to database
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper function to determine budget tier based on typical pricing
function getBudgetTier(brand, model) {
  const item = `${brand} ${model}`.toLowerCase()
  
  // High-end/Summit-fi brands and models
  if (item.includes('stax') || item.includes('sr-009') || item.includes('utopia') || 
      item.includes('susvara') || item.includes('ab-1266') || item.includes('shangri-la') ||
      item.includes('he1000') || item.includes('lcd-4') || item.includes('empyrean') ||
      item.includes('stellia') || item.includes('clear mg') || item.includes('arya')) {
    return 'high'
  }
  
  // Mid-tier
  if (item.includes('hd800') || item.includes('hd650') || item.includes('hd660') ||
      item.includes('sundara') || item.includes('ananda') || item.includes('edition') ||
      item.includes('lcd-2') || item.includes('lcd-x') || item.includes('dt1990') ||
      item.includes('clear') || item.includes('elex') || item.includes('focal')) {
    return 'mid'
  }
  
  return 'entry'
}

// Helper function to determine sound signature based on known characteristics
function getSoundSignature(brand, model, grade) {
  const item = `${brand} ${model}`.toLowerCase()
  
  if (item.includes('dt990') || item.includes('dt880') || item.includes('t1') ||
      item.includes('ad700') || item.includes('ad900') || item.includes('k701') ||
      item.includes('k702')) {
    return 'bright'
  }
  
  if (item.includes('hd650') || item.includes('hd600') || item.includes('hd580') ||
      item.includes('zmf') || item.includes('th900')) {
    return 'warm'
  }
  
  if (item.includes('dt770') || item.includes('th610') || item.includes('denon') ||
      item.includes('fostex') || item.includes('emu')) {
    return 'fun'
  }
  
  return 'neutral'
}

// Helper function to estimate pricing based on tier and brand
function getPricing(tier, brand, model) {
  const item = `${brand} ${model}`.toLowerCase()
  
  // Specific known pricing
  if (item.includes('hd650') || item.includes('hd600')) return { min: 250, max: 350 }
  if (item.includes('hd800s')) return { min: 1200, max: 1600 }
  if (item.includes('hd800')) return { min: 900, max: 1300 }
  if (item.includes('sundara')) return { min: 250, max: 350 }
  if (item.includes('ananda')) return { min: 500, max: 700 }
  if (item.includes('susvara')) return { min: 4000, max: 6000 }
  if (item.includes('utopia')) return { min: 3000, max: 4000 }
  if (item.includes('clear mg')) return { min: 1200, max: 1600 }
  if (item.includes('elex')) return { min: 550, max: 750 }
  
  // General tier-based pricing
  switch (tier) {
    case 'high':
      return { min: 1000, max: 6000 }
    case 'mid':
      return { min: 200, max: 1000 }
    case 'entry':
      return { min: 50, max: 300 }
    default:
      return { min: 100, max: 500 }
  }
}

const crinacleHeadphones = [
  // S+ TIER
  { brand: 'Stax', model: 'SR-009S', grade: 'S+', stars: 0 },
  { brand: 'Stax', model: 'SR-009', grade: 'S+', stars: 0 },
  { brand: 'Focal', model: 'Utopia (2022)', grade: 'S+', stars: 0 },
  { brand: 'Stax', model: 'SR-X9000', grade: 'S+', stars: 0 },
  { brand: 'HiFiMAN', model: 'Susvara', grade: 'S+', stars: 1 },
  { brand: 'Abyss', model: 'AB-1266 Phi TC', grade: 'S+', stars: 0 },
  { brand: 'Stax', model: 'SR-007 Mk2.9', grade: 'S+', stars: 1 },
  
  // S TIER
  { brand: 'Stax', model: 'SR-L700 Mk2', grade: 'S', stars: 2 },
  { brand: 'Stax', model: 'SR-007A', grade: 'S', stars: 0 },
  { brand: 'Stax', model: 'SR-007 Mk2', grade: 'S', stars: 1 },
  { brand: 'Stax', model: 'SR-L700', grade: 'S', stars: 1 },
  { brand: 'Sennheiser', model: 'HD800S', grade: 'S', stars: 2 },
  { brand: 'Focal', model: 'Utopia', grade: 'S', stars: 0 },
  { brand: 'Stax', model: 'SR-L500 Mk2', grade: 'S', stars: 2 },
  { brand: 'HiFiMAN', model: 'HE1000se', grade: 'S', stars: 1 },
  { brand: 'Audeze', model: 'LCD-4', grade: 'S', stars: 0 },
  { brand: 'Meze', model: 'Empyrean', grade: 'S', stars: 1 },
  { brand: 'Focal', model: 'Stellia', grade: 'S', stars: 0 },
  
  // A+ TIER
  { brand: 'Sennheiser', model: 'HD800', grade: 'A+', stars: 1 },
  { brand: 'HiFiMAN', model: 'Arya Stealth', grade: 'A+', stars: 2 },
  { brand: 'Focal', model: 'Clear Mg', grade: 'A+', stars: 2 },
  { brand: 'Audio-Technica', model: 'ATH-ADX5000', grade: 'A+', stars: 1 },
  { brand: 'HiFiMAN', model: 'Edition XS', grade: 'A+', stars: 3 },
  { brand: 'Audeze', model: 'LCD-X (2021)', grade: 'A+', stars: 2 },
  { brand: 'Stax', model: 'SR-L300', grade: 'A+', stars: 2 },
  { brand: 'Focal', model: 'Elex', grade: 'A+', stars: 2 },
  { brand: 'HiFiMAN', model: 'Ananda', grade: 'A+', stars: 2 },
  { brand: 'Audeze', model: 'LCD-2 Classic', grade: 'A+', stars: 2 },
  
  // A TIER
  { brand: 'Sennheiser', model: 'HD650', grade: 'A', stars: 3 },
  { brand: 'Sennheiser', model: 'HD600', grade: 'A', stars: 3 },
  { brand: 'HiFiMAN', model: 'Sundara (2020)', grade: 'A', stars: 3 },
  { brand: 'Beyerdynamic', model: 'DT1990 Pro', grade: 'A', stars: 2 },
  { brand: 'Audeze', model: 'LCD-X', grade: 'A', stars: 1 },
  { brand: 'Sennheiser', model: 'HD660S', grade: 'A', stars: 2 },
  { brand: 'AKG', model: 'K712 Pro', grade: 'A', stars: 2 },
  { brand: 'Focal', model: 'Clear', grade: 'A', stars: 1 },
  { brand: 'Audio-Technica', model: 'ATH-R70x', grade: 'A', stars: 2 },
  { brand: 'HiFiMAN', model: 'HE400se', grade: 'A', stars: 3 },
  
  // B+ TIER
  { brand: 'Audio-Technica', model: 'ATH-AD900X', grade: 'B+', stars: 2 },
  { brand: 'AKG', model: 'K702', grade: 'B+', stars: 2 },
  { brand: 'AKG', model: 'K701', grade: 'B+', stars: 2 },
  { brand: 'Audio-Technica', model: 'ATH-AD700X', grade: 'B+', stars: 2 },
  { brand: 'Beyerdynamic', model: 'DT880 (600Ω)', grade: 'B+', stars: 2 },
  { brand: 'Sennheiser', model: 'HD58X', grade: 'B+', stars: 2 },
  { brand: 'Beyerdynamic', model: 'DT990 Pro', grade: 'B+', stars: 2 },
  { brand: 'Audio-Technica', model: 'ATH-AD1000X', grade: 'B+', stars: 1 },
  { brand: 'Philips', model: 'SHP9500', grade: 'B+', stars: 3 },
  { brand: 'AKG', model: 'K612 Pro', grade: 'B+', stars: 2 },
  
  // B TIER
  { brand: 'Audio-Technica', model: 'ATH-M40x', grade: 'B', stars: 2 },
  { brand: 'Beyerdynamic', model: 'DT770 Pro', grade: 'B', stars: 2 },
  { brand: 'Sony', model: 'MDR-7506', grade: 'B', stars: 2 },
  { brand: 'AKG', model: 'K240 Studio', grade: 'B', stars: 2 },
  { brand: 'Grado', model: 'SR325x', grade: 'B', stars: 1 },
  { brand: 'Audio-Technica', model: 'ATH-M50x', grade: 'B', stars: 1 },
  { brand: 'Philips', model: 'X2HR', grade: 'B', stars: 2 },
  { brand: 'Sennheiser', model: 'HD560S', grade: 'B', stars: 2 },
  { brand: 'Beyerdynamic', model: 'DT880 Pro', grade: 'B', stars: 2 },
  { brand: 'Sennheiser', model: 'HD599', grade: 'B', stars: 2 }
]

async function addCrinacleHeadphones() {
  console.log('🎧 Adding Crinacle headphone rankings...')
  
  try {
    const headphonesWithDetails = crinacleHeadphones.map(headphone => {
      const tier = getBudgetTier(headphone.brand, headphone.model)
      const signature = getSoundSignature(headphone.brand, headphone.model, headphone.grade)
      const pricing = getPricing(tier, headphone.brand, headphone.model)
      
      return {
        name: headphone.model,
        brand: headphone.brand,
        category: 'cans',
        price_used_min: pricing.min,
        price_used_max: pricing.max,
        budget_tier: tier,
        sound_signature: signature,
        use_cases: ['music'],
        impedance: null, // Would need specific data
        needs_amp: tier === 'high' || headphone.model.includes('HD800') || headphone.model.includes('HE1000'),
        why_recommended: `Crinacle Grade ${headphone.grade}${headphone.stars > 0 ? ' with ' + '★'.repeat(headphone.stars) + ' value rating' : ''}. ${headphone.grade === 'S+' ? 'Summit-fi performance' : headphone.grade === 'S' ? 'Exceptional sound quality' : headphone.grade.startsWith('A') ? 'Excellent performance' : 'Good performance'}.`
      }
    })
    
    // Add in batches
    const batchSize = 15
    let totalAdded = 0
    
    for (let i = 0; i < headphonesWithDetails.length; i += batchSize) {
      const batch = headphonesWithDetails.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('components')
        .insert(batch)
        .select()
      
      if (error) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, error)
      } else {
        console.log(`✅ Added batch ${Math.floor(i/batchSize) + 1}: ${data.length} headphones`)
        data.forEach(hp => {
          console.log(`  ${hp.name} (${hp.brand}) - Grade ${crinacleHeadphones.find(c => c.brand === hp.brand && c.model === hp.name)?.grade} - $${hp.price_used_min}-${hp.price_used_max}`)
        })
        totalAdded += data.length
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log(`\n🎉 Successfully added ${totalAdded} headphones from Crinacle rankings!`)
    
  } catch (err) {
    console.error('❌ Failed:', err)
  }
}

if (require.main === module) {
  addCrinacleHeadphones()
}

module.exports = { addCrinacleHeadphones }