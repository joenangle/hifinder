// Add comprehensive IEM database from spreadsheet
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper function to extract price from string
function extractPrice(priceStr) {
  if (!priceStr) return null
  const match = priceStr.match(/\$(\d+)/);
  return match ? parseInt(match[1]) : null;
}

// Helper function to determine budget tier based on price
function getBudgetTier(price) {
  if (!price) return 'entry'
  if (price >= 1000) return 'high'
  if (price >= 300) return 'mid'
  return 'entry'
}

// Helper function to extract sound signature
function getSoundSignature(tuning) {
  if (!tuning) return 'neutral'
  const t = tuning.toLowerCase()
  if (t.includes('v-shape') || t.includes('fun') || t.includes('exciting')) return 'fun'
  if (t.includes('bright') || t.includes('sparkly') || t.includes('airy')) return 'bright'
  if (t.includes('warm') || t.includes('bassy')) return 'warm'
  if (t.includes('harman') || t.includes('balanced') || t.includes('clean')) return 'neutral'
  return 'neutral'
}

const comprehensiveIEMs = [
  // PERFECTION/SUMMIT-FI (S+/S Tier)
  {
    name: 'SUBTONIC STORM',
    brand: 'Subtonic',
    category: 'iems',
    price_used_min: 4500,
    price_used_max: 5500,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 16,
    needs_amp: false,
    why_recommended: 'The best IEM reviewed. Best timbre. Super natural. TOTL tech. Perfect coherency and dynamics.'
  },
  {
    name: 'Cadenza 12',
    brand: 'LETSHUOER',
    category: 'iems',
    price_used_min: 1900,
    price_used_max: 2400,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Better version of U12T vocal/tuning wise, no mid scoop. Perfect vocals - sweet, extended, open, airy, never fatiguing. TOTL resolution and staging.'
  },
  {
    name: 'Valhalla',
    brand: 'Thieaudio',
    category: 'iems',
    price_used_min: 1700,
    price_used_max: 2200,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 22,
    needs_amp: false,
    why_recommended: 'TOTL all-rounder with endgame tech across the board, a better tuned U12T with better bass texture'
  },
  {
    name: 'Grand Maestro',
    brand: 'FatFreq',
    category: 'iems',
    price_used_min: 2700,
    price_used_max: 3300,
    budget_tier: 'high',
    sound_signature: 'fun',
    use_cases: ['music'],
    impedance: 16,
    needs_amp: false,
    why_recommended: 'The best basshead set. Amazing low-end texture and impact while maintaining clarity.'
  },

  // ENDGAME (S- Tier)
  {
    name: 'MYSTIC 8',
    brand: 'LETSHUOER',
    category: 'iems',
    price_used_min: 850,
    price_used_max: 1100,
    budget_tier: 'high',
    sound_signature: 'bright',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Vocal benchmark for female vocals under $2000. Clean, airy, sweet, ethereal. Better than Diva and direct upgrade to Oracle.'
  },
  {
    name: 'Monarch MK4',
    brand: 'Thieaudio',
    category: 'iems',
    price_used_min: 950,
    price_used_max: 1200,
    budget_tier: 'high',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 22,
    needs_amp: false,
    why_recommended: 'Smooth, clean, balanced, and slightly airy. Goes from clean all-rounder to warm/bassy all-rounder. Great tech. Endgame for most people.'
  },
  {
    name: 'Prestige LTD',
    brand: 'Thieaudio',
    category: 'iems',
    price_used_min: 1100,
    price_used_max: 1400,
    budget_tier: 'high',
    sound_signature: 'bright',
    use_cases: ['music'],
    impedance: 22,
    needs_amp: false,
    why_recommended: 'Clean and natural signature with treble emphasis. Technical monster with airy treble. Open sense of space. Endgame all-rounder.'
  },
  {
    name: 'Crimson',
    brand: 'Symphonium',
    category: 'iems',
    price_used_min: 1300,
    price_used_max: 1600,
    budget_tier: 'high',
    sound_signature: 'fun',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'U-shaped/V-shaped with energetic treble. Great tech. Fun signature with excellent dynamics.'
  },
  {
    name: 'EJ07',
    brand: 'LETSHUOER',
    category: 'iems',
    price_used_min: 750,
    price_used_max: 950,
    budget_tier: 'mid',
    sound_signature: 'warm',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'TOTL mids. Most 3D and holographic staging. Most immersive set for rock, alternative, ballads, and classical. Needs high volume.'
  },
  {
    name: 'RSV',
    brand: 'Softears',
    category: 'iems',
    price_used_min: 650,
    price_used_max: 800,
    budget_tier: 'mid',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'One of the best vocals on any IEM (especially for male artists). Mids and treble is TOTL, smooth and well extended with perfect bite.'
  },

  // HIGH-VALUE MID TIER
  {
    name: 'Arcanis',
    brand: 'ZIIGAAT',
    category: 'iems',
    price_used_min: 350,
    price_used_max: 450,
    budget_tier: 'mid',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Favorite vocals under $500. More refined OG Tea with better resolution and tech. Pinpoint imaging and open staging.'
  },
  {
    name: 'Carmen',
    brand: 'Yanyin',
    category: 'iems',
    price_used_min: 750,
    price_used_max: 900,
    budget_tier: 'mid',
    sound_signature: 'warm',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Full, powerful, extended vocals. Makes songs very intimate and vulnerable. Blast your brains out kind of set. High volume recommended.'
  },
  {
    name: 'Twilight',
    brand: 'Softears',
    category: 'iems',
    price_used_min: 700,
    price_used_max: 950,
    budget_tier: 'mid',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Slightly warm/neutral, very well balanced, good scaling, TOTL male vocals, big staging.'
  },
  {
    name: 'Luna',
    brand: 'ZIIGAAT',
    category: 'iems',
    price_used_min: 330,
    price_used_max: 420,
    budget_tier: 'mid',
    sound_signature: 'warm',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Airy, smooth, warm, laid-back, balanced, lush and dreamy vibes. Great for rock/metal, scales well at higher volumes.'
  },
  {
    name: 'Odyssey',
    brand: 'ZIIGAAT',
    category: 'iems',
    price_used_min: 200,
    price_used_max: 260,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'A mini Subtonic Storm that scales better. Musical odyssey. High volume set with great scaling and immersive experience.'
  },
  {
    name: 'HBB PUNCH',
    brand: 'Kiwi Ears',
    category: 'iems',
    price_used_min: 400,
    price_used_max: 500,
    budget_tier: 'mid',
    sound_signature: 'fun',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Endgame balanced-basshead set. Amazing low-end texture, rumble, slam. Vocals and treble still well extended and clear.'
  },

  // BUDGET CHAMPIONS
  {
    name: 'Astral',
    brand: 'Kiwi Ears',
    category: 'iems',
    price_used_min: 250,
    price_used_max: 330,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Great all-rounder. Slightly airy with good sub-bass extension. Balanced but still fun. Cleaner and airier than Meta.'
  },
  {
    name: 'Studio 4',
    brand: 'Softears',
    category: 'iems',
    price_used_min: 350,
    price_used_max: 480,
    budget_tier: 'mid',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Best all-rounder under $500. Correct and neutral tuning. Perfect vocals, zero faults. Great separation and stage size.'
  },
  {
    name: 'HYPE 4',
    brand: 'Thieaudio',
    category: 'iems',
    price_used_min: 350,
    price_used_max: 450,
    budget_tier: 'mid',
    sound_signature: 'fun',
    use_cases: ['music'],
    impedance: 22,
    needs_amp: false,
    why_recommended: 'One of the best all-rounders under $600. V-shaped Harman with smooth treble extension. Great low-end texture and impact.'
  },
  {
    name: 'Tea Pro',
    brand: 'XENNS',
    category: 'iems',
    price_used_min: 320,
    price_used_max: 400,
    budget_tier: 'entry',
    sound_signature: 'fun',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'More resolving Davinci. Most refined and well-balanced. Bassy with better low-end texture, heavier notes, great all-rounder.'
  },
  {
    name: 'Meta',
    brand: 'CrinEar',
    category: 'iems',
    price_used_min: 220,
    price_used_max: 280,
    budget_tier: 'entry',
    sound_signature: 'bright',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Bright-leaning all-rounder with sparkly treble. Great tech for price. Good coloration that\'s not vanilla and safe.'
  },
  {
    name: 'Pilgrim',
    brand: 'Elysian',
    category: 'iems',
    price_used_min: 350,
    price_used_max: 450,
    budget_tier: 'mid',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Clean, clear, all-rounder. Similar tuning as Dusk but with better vocals and bass quality. Aesthetically pleasing.'
  },

  // GREAT VALUE BUDGET
  {
    name: 'SUPERMIX4',
    brand: 'SIMGOT',
    category: 'iems',
    price_used_min: 130,
    price_used_max: 170,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Endgame Harman, one of the smoothest IEMs heard. Great value with refined sound and smooth dynamics.'
  },
  {
    name: 'EA500LM',
    brand: 'Simgot',
    category: 'iems',
    price_used_min: 80,
    price_used_max: 110,
    budget_tier: 'entry',
    sound_signature: 'warm',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Very resolving for price. Warmer EA1000 with slight decrease in separation but better all-rounder. Great value.'
  },
  {
    name: 'EM6L Phoenix',
    brand: 'Simgot',
    category: 'iems',
    price_used_min: 95,
    price_used_max: 130,
    budget_tier: 'entry',
    sound_signature: 'warm',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Great resolution and tech, one of the smoothest IEMs. Slightly warm but lively. Watch for unit variance.'
  },
  {
    name: 'NOVA',
    brand: 'Truthear',
    category: 'iems',
    price_used_min: 130,
    price_used_max: 170,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Clean Harman sound with smooth treble. One of the best treble under $200. Requires foam tips for best performance.'
  },
  {
    name: 'HEXA',
    brand: 'Truthear',
    category: 'iems',
    price_used_min: 70,
    price_used_max: 95,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Amazing detail for price. Better tuned softer Dusk. Foam tips help tame uppermids/treble. New benchmark below $100.'
  },

  // ENTRY LEVEL EXCELLENCE
  {
    name: 'EW300',
    brand: 'SIMGOT',
    category: 'iems',
    price_used_min: 65,
    price_used_max: 85,
    budget_tier: 'entry',
    sound_signature: 'warm',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Smoother and more refined EW200 with better layering. Pink nozzle better for rock/hiphop/metal. Very good piezo implementation.'
  },
  {
    name: 'EW200',
    brand: 'Simgot',
    category: 'iems',
    price_used_min: 35,
    price_used_max: 50,
    budget_tier: 'entry',
    sound_signature: 'warm',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Cheaper Aria 2 with less mid-bass. Same driver and technical performance. Great starter set with good value.'
  },
  {
    name: 'Waner',
    brand: 'TangZu',
    category: 'iems',
    price_used_min: 18,
    price_used_max: 25,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Balanced all-rounder. Most vocal forward out of the $20 sets. Basically modded Zero with slight more bass.'
  },
  {
    name: 'CHU 2',
    brand: 'Moondrop',
    category: 'iems',
    price_used_min: 17,
    price_used_max: 25,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Harman-ish tuning. Similar to Tanchjim One but not as smooth. Good entry-level neutral sound.'
  },
  {
    name: 'Zero',
    brand: '7Hz Salnotes',
    category: 'iems',
    price_used_min: 18,
    price_used_max: 25,
    budget_tier: 'entry',
    sound_signature: 'neutral',
    use_cases: ['music'],
    impedance: 32,
    needs_amp: false,
    why_recommended: 'Stock Chu with little more bass and smoother uppermids/treble. Great entry-level balanced sound.'
  }
]

async function addComprehensiveIEMs() {
  console.log('🎵 Adding comprehensive IEM database...')
  
  try {
    // Add in batches to avoid overwhelming the database
    const batchSize = 10
    let totalAdded = 0
    
    for (let i = 0; i < comprehensiveIEMs.length; i += batchSize) {
      const batch = comprehensiveIEMs.slice(i, i + batchSize)
      
      const { data, error } = await supabase
        .from('components')
        .insert(batch)
        .select()
      
      if (error) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, error)
      } else {
        console.log(`✅ Added batch ${Math.floor(i/batchSize) + 1}: ${data.length} IEMs`)
        data.forEach(iem => {
          console.log(`  ${iem.name} (${iem.brand}) - $${iem.price_used_min}-${iem.price_used_max}`)
        })
        totalAdded += data.length
      }
    }
    
    console.log(`\n🎉 Successfully added ${totalAdded} IEMs to the database!`)
    
  } catch (err) {
    console.error('❌ Failed:', err)
  }
}

if (require.main === module) {
  addComprehensiveIEMs()
}

module.exports = { addComprehensiveIEMs }