// Fix pricing data with realistic MSRP and used price ranges
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Realistic pricing data based on current market prices
const pricingData = {
  // Sennheiser
  'Sennheiser HD600': { msrp: 399, used_min: 250, used_max: 320 },
  'Sennheiser HD650': { msrp: 499, used_min: 280, used_max: 360 },
  'Sennheiser HD660S': { msrp: 499, used_min: 320, used_max: 400 },
  'Sennheiser HD800': { msrp: 1499, used_min: 900, used_max: 1200 },
  'Sennheiser HD800S': { msrp: 1699, used_min: 1200, used_max: 1500 },
  'Sennheiser HD58X': { msrp: 170, used_min: 120, used_max: 150 },
  'Sennheiser HD560S': { msrp: 199, used_min: 130, used_max: 170 },
  'Sennheiser HD599': { msrp: 199, used_min: 100, used_max: 140 },
  
  // HiFiMAN
  'HiFiMAN Sundara': { msrp: 349, used_min: 250, used_max: 300 },
  'HiFiMAN Ananda': { msrp: 699, used_min: 500, used_max: 600 },
  'HiFiMAN Arya Stealth': { msrp: 1299, used_min: 900, used_max: 1100 },
  'HiFiMAN Susvara': { msrp: 6000, used_min: 4000, used_max: 5200 },
  'HiFiMAN HE400se': { msrp: 149, used_min: 90, used_max: 120 },
  'HiFiMAN Edition XS': { msrp: 499, used_min: 350, used_max: 430 },
  'HiFiMAN HE1000se': { msrp: 3499, used_min: 2200, used_max: 2800 },
  
  // Focal
  'Focal Clear': { msrp: 1499, used_min: 900, used_max: 1200 },
  'Focal Clear Mg': { msrp: 1699, used_min: 1200, used_max: 1500 },
  'Focal Utopia': { msrp: 4999, used_min: 3000, used_max: 4000 },
  'Focal Utopia (2022)': { msrp: 5999, used_min: 4500, used_max: 5500 },
  'Focal Stellia': { msrp: 2999, used_min: 2000, used_max: 2500 },
  'Focal Elex': { msrp: 699, used_min: 450, used_max: 600 },
  
  // Audeze
  'Audeze LCD-2 Classic': { msrp: 799, used_min: 500, used_max: 650 },
  'Audeze LCD-X': { msrp: 1199, used_min: 800, used_max: 1000 },
  'Audeze LCD-X (2021)': { msrp: 1199, used_min: 800, used_max: 1000 },
  'Audeze LCD-4': { msrp: 3995, used_min: 2500, used_max: 3200 },
  
  // Beyerdynamic
  'Beyerdynamic DT770 Pro': { msrp: 179, used_min: 120, used_max: 150 },
  'Beyerdynamic DT880 Pro': { msrp: 179, used_min: 110, used_max: 150 },
  'Beyerdynamic DT880 (600Ω)': { msrp: 199, used_min: 120, used_max: 160 },
  'Beyerdynamic DT990 Pro': { msrp: 179, used_min: 110, used_max: 150 },
  'Beyerdynamic DT1990 Pro': { msrp: 599, used_min: 380, used_max: 480 },
  
  // Audio-Technica
  'Audio-Technica ATH-M40x': { msrp: 99, used_min: 70, used_max: 85 },
  'Audio-Technica ATH-M50x': { msrp: 149, used_min: 100, used_max: 130 },
  'Audio-Technica ATH-R70x': { msrp: 349, used_min: 220, used_max: 280 },
  'Audio-Technica ATH-AD700X': { msrp: 119, used_min: 80, used_max: 100 },
  'Audio-Technica ATH-AD900X': { msrp: 149, used_min: 100, used_max: 130 },
  'Audio-Technica ATH-AD1000X': { msrp: 299, used_min: 180, used_max: 230 },
  'Audio-Technica ATH-ADX5000': { msrp: 1999, used_min: 1400, used_max: 1700 },
  
  // AKG
  'AKG K240 Studio': { msrp: 69, used_min: 45, used_max: 60 },
  'AKG K612 Pro': { msrp: 199, used_min: 120, used_max: 160 },
  'AKG K701': { msrp: 199, used_min: 120, used_max: 160 },
  'AKG K702': { msrp: 199, used_min: 130, used_max: 170 },
  'AKG K712 Pro': { msrp: 299, used_min: 180, used_max: 230 },
  
  // Sony
  'Sony MDR-7506': { msrp: 99, used_min: 70, used_max: 85 },
  
  // Philips
  'Philips SHP9500': { msrp: 79, used_min: 50, used_max: 70 },
  'Philips X2HR': { msrp: 149, used_min: 100, used_max: 130 },
  
  // Grado
  'Grado SR325x': { msrp: 295, used_min: 180, used_max: 230 },
  
  // Meze
  'Meze Empyrean': { msrp: 2999, used_min: 2000, used_max: 2500 },
  
  // Stax (Electrostatic - higher prices)
  'Stax SR-L300': { msrp: 499, used_min: 350, used_max: 450 },
  'Stax SR-L500 Mk2': { msrp: 899, used_min: 650, used_max: 800 },
  'Stax SR-L700': { msrp: 1399, used_min: 1000, used_max: 1250 },
  'Stax SR-L700 Mk2': { msrp: 1499, used_min: 1100, used_max: 1350 },
  'Stax SR-007A': { msrp: 2399, used_min: 1700, used_max: 2100 },
  'Stax SR-007 Mk2': { msrp: 2399, used_min: 1700, used_max: 2100 },
  'Stax SR-007 Mk2.9': { msrp: 2399, used_min: 1700, used_max: 2100 },
  'Stax SR-009': { msrp: 4599, used_min: 3200, used_max: 4000 },
  'Stax SR-009S': { msrp: 5399, used_min: 3800, used_max: 4800 },
  'Stax SR-X9000': { msrp: 6999, used_min: 5500, used_max: 6500 },
  
  // Abyss
  'Abyss AB-1266 Phi TC': { msrp: 5999, used_min: 4500, used_max: 5500 }
}

async function updatePricingData() {
  console.log('🔧 Starting pricing data fix...')
  
  let totalUpdated = 0
  
  for (const [fullName, pricing] of Object.entries(pricingData)) {
    // Try to find the component by name
    const nameParts = fullName.split(' ')
    const brand = nameParts[0]
    const modelName = nameParts.slice(1).join(' ')
    
    try {
      const { data: components, error } = await supabase
        .from('components')
        .select('id, name, brand')
        .eq('brand', brand)
        .ilike('name', `%${modelName}%`)
        .eq('category', 'cans')
        
      if (error) {
        console.error(`Error finding ${fullName}:`, error.message)
        continue
      }
      
      if (!components || components.length === 0) {
        console.log(`⚠️  Not found: ${fullName}`)
        continue
      }
      
      // Update each matching component
      for (const component of components) {
        const { error: updateError } = await supabase
          .from('components')
          .update({
            price_new: pricing.msrp,
            price_used_min: pricing.used_min,
            price_used_max: pricing.used_max
          })
          .eq('id', component.id)
          
        if (updateError) {
          console.error(`Error updating ${component.name}:`, updateError.message)
        } else {
          console.log(`✅ Updated: ${component.brand} ${component.name} - MSRP: $${pricing.msrp}, Used: $${pricing.used_min}-${pricing.used_max}`)
          totalUpdated++
        }
      }
      
    } catch (err) {
      console.error(`Error processing ${fullName}:`, err.message)
    }
  }
  
  console.log(`🎉 Successfully updated pricing for ${totalUpdated} headphones!`)
}

updatePricingData().catch(console.error)