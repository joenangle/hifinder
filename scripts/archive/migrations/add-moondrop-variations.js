// Add Moondrop Variations IEM to database
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const moondropVariations = {
  name: 'Variations',
  brand: 'Moondrop',
  category: 'iems',
  price_new: 520,  // MSRP from multiple sources
  price_used_min: 350,  // Estimated based on typical 30-35% depreciation
  price_used_max: 450,  // Estimated based on excellent condition pricing
  budget_tier: 'mid',  // $520 fits mid-tier range (typically $300-800)
  sound_signature: 'fun',  // Bass-heavy with clean mids and forward treble = fun signature
  use_cases: ['music', 'gaming'], // Tribrid design good for both, especially bass-heavy music
  impedance: 15,  // 15.2Ω @1kHz from specs (rounded to integer for database)
  needs_amp: false,  // 118dB/Vrms sensitivity means easily driven by phones/dongles
  amazon_url: null,  // No direct Amazon listing found in research
  why_recommended: 'Tribrid IEM with 2 electrostatic + 2 balanced armature + 1 dynamic driver. Follows Harman target with significant sub-bass emphasis for impactful but clean bass response. Excellent technical performance with wide soundstage and precise imaging. Well-built with medical-grade UV resin shell and interchangeable cable system.'
}

async function addMoondropVariations() {
  console.log('🎧 Adding Moondrop Variations IEM to database...')
  
  try {
    // Check if it already exists
    const { data: existing, error: checkError } = await supabase
      .from('components')
      .select('id')
      .eq('brand', 'Moondrop')
      .eq('name', 'Variations')
      .eq('category', 'iems')
    
    if (checkError) {
      console.error('Error checking existing:', checkError)
      return
    }
    
    if (existing && existing.length > 0) {
      console.log('⚠️  Moondrop Variations already exists in database')
      return
    }
    
    // Insert new component
    const { data, error } = await supabase
      .from('components')
      .insert([moondropVariations])
      .select()
    
    if (error) {
      console.error('❌ Error inserting:', error)
      return
    }
    
    if (data && data.length > 0) {
      console.log('✅ Successfully added Moondrop Variations IEM!')
      console.log(`   ID: ${data[0].id}`)
      console.log(`   Name: ${data[0].brand} ${data[0].name}`)
      console.log(`   Category: ${data[0].category}`)
      console.log(`   Price: $${data[0].price_new} MSRP, $${data[0].price_used_min}-${data[0].price_used_max} used`)
      console.log(`   Impedance: ${data[0].impedance}Ω`)
      console.log(`   Sound: ${data[0].sound_signature}`)
      console.log(`   Tier: ${data[0].budget_tier}`)
      console.log(`   Use Cases: ${data[0].use_cases.join(', ')}`)
    }
    
  } catch (err) {
    console.error('❌ Failed to add Moondrop Variations:', err.message)
  }
}

if (require.main === module) {
  addMoondropVariations()
}

module.exports = { addMoondropVariations }