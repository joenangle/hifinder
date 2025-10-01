const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ASR Amplifier data (manually collected from Audio Science Review)
// Format: Brand, Model, Power Output, SINAD, Price Range
const asrAmps = [
  // High-Performance Desktop Amps
  { brand: 'Topping', model: 'A90', power_output: '500mW @ 32Ω, 7.8W @ 32Ω balanced', asr_sinad: 121, price_min: 400, price_max: 500 },
  { brand: 'Topping', model: 'A30 Pro', power_output: '280mW @ 32Ω, 3.5W @ 32Ω balanced', asr_sinad: 120, price_min: 300, price_max: 350 },
  { brand: 'SMSL', model: 'SH-9', power_output: '3W @ 32Ω', asr_sinad: 120, price_min: 250, price_max: 300 },
  { brand: 'Schiit', model: 'Magnius', power_output: '2.2W @ 32Ω, 5W @ 32Ω balanced', asr_sinad: 119, price_min: 180, price_max: 200 },
  { brand: 'JDS Labs', model: 'Atom Amp+', power_output: '1W @ 32Ω', asr_sinad: 115, price_min: 120, price_max: 140 },
  { brand: 'Schiit', model: 'Heresy', power_output: '2.8W @ 32Ω', asr_sinad: 114, price_min: 90, price_max: 110 },

  // Portable/Budget Amps
  { brand: 'Topping', model: 'L30 II', power_output: '3.5W @ 32Ω', asr_sinad: 121, price_min: 140, price_max: 160 },
  { brand: 'FiiO', model: 'K5 Pro', power_output: '1.5W @ 32Ω', asr_sinad: 110, price_min: 130, price_max: 150 },
  { brand: 'iFi', model: 'Zen CAN', power_output: '1.6W @ 32Ω', asr_sinad: 105, price_min: 140, price_max: 160 },

  // Summit-Fi Amps
  { brand: 'Benchmark', model: 'HPA4', power_output: '6W @ 16Ω', asr_sinad: 122, price_min: 2800, price_max: 3200 },
  { brand: 'THX', model: 'AAA 789', power_output: '6W @ 32Ω balanced', asr_sinad: 119, price_min: 250, price_max: 300 },
  { brand: 'Monoprice', model: 'Monolith 887', power_output: '8.8W @ 32Ω balanced', asr_sinad: 118, price_min: 450, price_max: 500 },
]

// ASR DAC data
const asrDacs = [
  // Desktop DACs
  { brand: 'Topping', model: 'D90SE', asr_sinad: 123, price_min: 700, price_max: 800 },
  { brand: 'Topping', model: 'E50', asr_sinad: 120, price_min: 240, price_max: 260 },
  { brand: 'SMSL', model: 'D-6', asr_sinad: 121, price_min: 180, price_max: 200 },
  { brand: 'Schiit', model: 'Modi+', asr_sinad: 115, price_min: 120, price_max: 140 },
  { brand: 'JDS Labs', model: 'Atom DAC+', asr_sinad: 114, price_min: 120, price_max: 140 },

  // Summit-Fi DACs
  { brand: 'Benchmark', model: 'DAC3 B', asr_sinad: 121, price_min: 1600, price_max: 1800 },
  { brand: 'RME', model: 'ADI-2 DAC FS', asr_sinad: 120, price_min: 1100, price_max: 1300 },
  { brand: 'Gustard', model: 'X26 Pro', asr_sinad: 122, price_min: 1300, price_max: 1500 },
]

// ASR Combo Units (DAC/Amp)
const asrCombos = [
  { brand: 'Topping', model: 'DX3 Pro+', power_output: '1.8W @ 32Ω', asr_sinad: 117, price_min: 180, price_max: 200 },
  { brand: 'Topping', model: 'DX5', power_output: '1.8W @ 32Ω', asr_sinad: 118, price_min: 320, price_max: 350 },
  { brand: 'SMSL', model: 'DO200 MKII', power_output: '3W @ 32Ω', asr_sinad: 119, price_min: 350, price_max: 400 },
  { brand: 'FiiO', model: 'K7', power_output: '2W @ 32Ω', asr_sinad: 114, price_min: 180, price_max: 200 },
  { brand: 'iFi', model: 'Zen DAC V2', power_output: '1W @ 32Ω', asr_sinad: 105, price_min: 140, price_max: 180 },
  { brand: 'Schiit', model: 'Hel 2E', power_output: '1.2W @ 32Ω', asr_sinad: 110, price_min: 180, price_max: 200 },
]

async function importASRData() {
  console.log('🔊 Starting ASR data import...')

  try {
    // Import Amplifiers
    console.log('\n📊 Importing Amplifiers...')
    for (const amp of asrAmps) {
      const { data: existing } = await supabase
        .from('components')
        .select('id')
        .eq('brand', amp.brand)
        .eq('name', amp.model)
        .eq('category', 'amp')
        .single()

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('components')
          .update({
            power_output: amp.power_output,
            asr_sinad: amp.asr_sinad,
            price_used_min: amp.price_min * 0.7,
            price_used_max: amp.price_max * 0.85,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (!error) {
          console.log(`✅ Updated: ${amp.brand} ${amp.model}`)
        }
      } else {
        // Insert new
        const { error } = await supabase
          .from('components')
          .insert({
            brand: amp.brand,
            name: amp.model,
            category: 'amp',
            power_output: amp.power_output,
            asr_sinad: amp.asr_sinad,
            price_new: amp.price_max,
            price_used_min: amp.price_min * 0.7,
            price_used_max: amp.price_max * 0.85,
            source: 'asr_manual_import',
            created_at: new Date().toISOString()
          })

        if (!error) {
          console.log(`➕ Added: ${amp.brand} ${amp.model}`)
        }
      }
    }

    // Import DACs
    console.log('\n📊 Importing DACs...')
    for (const dac of asrDacs) {
      const { data: existing } = await supabase
        .from('components')
        .select('id')
        .eq('brand', dac.brand)
        .eq('name', dac.model)
        .eq('category', 'dac')
        .single()

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('components')
          .update({
            asr_sinad: dac.asr_sinad,
            price_used_min: dac.price_min * 0.7,
            price_used_max: dac.price_max * 0.85,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (!error) {
          console.log(`✅ Updated: ${dac.brand} ${dac.model}`)
        }
      } else {
        // Insert new
        const { error } = await supabase
          .from('components')
          .insert({
            brand: dac.brand,
            name: dac.model,
            category: 'dac',
            asr_sinad: dac.asr_sinad,
            price_new: dac.price_max,
            price_used_min: dac.price_min * 0.7,
            price_used_max: dac.price_max * 0.85,
            source: 'asr_manual_import',
            created_at: new Date().toISOString()
          })

        if (!error) {
          console.log(`➕ Added: ${dac.brand} ${dac.model}`)
        }
      }
    }

    // Import Combos
    console.log('\n📊 Importing DAC/Amp Combos...')
    for (const combo of asrCombos) {
      const { data: existing } = await supabase
        .from('components')
        .select('id')
        .eq('brand', combo.brand)
        .eq('name', combo.model)
        .eq('category', 'dac_amp')
        .single()

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('components')
          .update({
            power_output: combo.power_output,
            asr_sinad: combo.asr_sinad,
            price_used_min: combo.price_min * 0.7,
            price_used_max: combo.price_max * 0.85,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (!error) {
          console.log(`✅ Updated: ${combo.brand} ${combo.model}`)
        }
      } else {
        // Insert new
        const { error } = await supabase
          .from('components')
          .insert({
            brand: combo.brand,
            name: combo.model,
            category: 'dac_amp',
            power_output: combo.power_output,
            asr_sinad: combo.asr_sinad,
            price_new: combo.price_max,
            price_used_min: combo.price_min * 0.7,
            price_used_max: combo.price_max * 0.85,
            source: 'asr_manual_import',
            created_at: new Date().toISOString()
          })

        if (!error) {
          console.log(`➕ Added: ${combo.brand} ${combo.model}`)
        }
      }
    }

    // Show summary
    console.log('\n✅ ASR data import complete!')
    console.log(`   - ${asrAmps.length} amplifiers`)
    console.log(`   - ${asrDacs.length} DACs`)
    console.log(`   - ${asrCombos.length} combo units`)

  } catch (error) {
    console.error('❌ Error during import:', error)
    process.exit(1)
  }
}

// Run the import
importASRData()