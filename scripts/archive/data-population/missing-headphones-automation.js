// Automated system for handling missing headphones in HiFinder database
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs').promises
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

class MissingHeadphoneHandler {
  constructor() {
    this.knownDataSources = {
      // Popular headphone databases and APIs
      crinacle: 'https://crinacle.com/rankings/',
      rtings: 'https://www.rtings.com/headphones',
      asr: 'https://www.audiosciencereview.com',
      headfi: 'https://www.head-fi.org'
    }
    
    this.priceEstimationRules = {
      // Rules for estimating used prices when MSRP is known
      depreciation: {
        entry: { min: 0.5, max: 0.7 },    // 50-70% of MSRP
        mid: { min: 0.65, max: 0.85 },    // 65-85% of MSRP  
        high: { min: 0.7, max: 0.9 }      // 70-90% of MSRP
      }
    }
  }

  // Check if a headphone exists in the database
  async checkExists(brand, model, category = null) {
    const query = supabase
      .from('components')
      .select('id, name, brand, category')
      .ilike('brand', `%${brand}%`)
      .ilike('name', `%${model}%`)
    
    if (category) {
      query.eq('category', category)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Database check error:', error)
      return { exists: false, error }
    }
    
    return { 
      exists: data && data.length > 0, 
      matches: data,
      exactMatch: data?.find(item => 
        item.brand.toLowerCase() === brand.toLowerCase() && 
        item.name.toLowerCase() === model.toLowerCase()
      )
    }
  }

  // Estimate pricing tier based on MSRP
  getBudgetTier(msrp) {
    if (msrp <= 300) return 'entry'
    if (msrp <= 800) return 'mid'
    return 'high'
  }

  // Estimate used price range from MSRP
  estimateUsedPricing(msrp, tier) {
    const rules = this.priceEstimationRules.depreciation[tier]
    return {
      min: Math.round(msrp * rules.min),
      max: Math.round(msrp * rules.max)
    }
  }

  // Classify sound signature from description
  classifySoundSignature(description) {
    const desc = description.toLowerCase()
    
    // Fun signature indicators
    if (desc.includes('v-shaped') || desc.includes('bass-heavy') || 
        desc.includes('exciting') || desc.includes('colored')) {
      return 'fun'
    }
    
    // Bright signature indicators  
    if (desc.includes('bright') || desc.includes('treble-forward') ||
        desc.includes('analytical') || desc.includes('detail')) {
      return 'bright'
    }
    
    // Warm signature indicators
    if (desc.includes('warm') || desc.includes('smooth') ||
        desc.includes('bass-forward') || desc.includes('laid-back')) {
      return 'warm'
    }
    
    // Default to neutral
    return 'neutral'
  }

  // Determine if amplification is needed
  needsAmplification(impedance, sensitivity = null) {
    // High impedance generally needs amp
    if (impedance >= 250) return true
    
    // Low sensitivity + moderate impedance needs amp
    if (sensitivity && sensitivity < 100 && impedance >= 80) return true
    
    // Most modern headphones under 80Ω don't need dedicated amp
    return impedance >= 80
  }

  // Generate missing headphone report
  async generateMissingReport(requestedHeadphones) {
    console.log('🔍 Generating missing headphones report...')
    
    const report = {
      missing: [],
      found: [],
      similar: []
    }
    
    for (const { brand, model, category } of requestedHeadphones) {
      const check = await this.checkExists(brand, model, category)
      
      if (check.exactMatch) {
        report.found.push({ brand, model, match: check.exactMatch })
      } else if (check.matches && check.matches.length > 0) {
        report.similar.push({ 
          brand, 
          model, 
          similar: check.matches.map(m => `${m.brand} ${m.name}`)
        })
      } else {
        report.missing.push({ brand, model, category })
      }
    }
    
    return report
  }

  // Create skeleton data for manual completion
  createSkeletonEntry(brand, model, category = 'cans') {
    return {
      name: model,
      brand: brand,
      category: category,
      price_new: null, // NEEDS RESEARCH
      price_used_min: null, // NEEDS RESEARCH  
      price_used_max: null, // NEEDS RESEARCH
      budget_tier: null, // DETERMINED FROM PRICE
      sound_signature: null, // NEEDS RESEARCH
      use_cases: ['music'], // DEFAULT - EXPAND BASED ON RESEARCH
      impedance: null, // NEEDS RESEARCH
      needs_amp: null, // DETERMINED FROM IMPEDANCE
      amazon_url: null, // NEEDS RESEARCH
      why_recommended: `${brand} ${model} - NEEDS DETAILED RESEARCH AND DESCRIPTION`
    }
  }

  // Generate addition script for missing headphone
  async generateAdditionScript(brand, model, category = 'cans') {
    const scriptName = `add-${brand.toLowerCase()}-${model.toLowerCase().replace(/\s+/g, '-')}.js`
    const scriptPath = path.join(__dirname, scriptName)
    
    const skeletonData = this.createSkeletonEntry(brand, model, category)
    
    const scriptContent = `// Add ${brand} ${model} to database
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// TODO: Complete research and fill in accurate data
const headphoneData = ${JSON.stringify(skeletonData, null, 2)}

async function addHeadphone() {
  console.log('🎧 Adding ${brand} ${model} to database...')
  
  try {
    // Check if already exists
    const { data: existing, error: checkError } = await supabase
      .from('components')
      .select('id')
      .eq('brand', '${brand}')
      .eq('name', '${model}')
      .eq('category', '${category}')
    
    if (checkError) {
      console.error('Error checking existing:', checkError)
      return
    }
    
    if (existing && existing.length > 0) {
      console.log('⚠️  ${brand} ${model} already exists in database')
      return
    }
    
    // Validate required fields
    const requiredFields = ['price_new', 'price_used_min', 'price_used_max', 'budget_tier', 'sound_signature', 'impedance']
    const missingFields = requiredFields.filter(field => headphoneData[field] === null)
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required data:', missingFields.join(', '))
      console.log('Please complete research and update headphoneData object')
      return
    }
    
    // Insert new component
    const { data, error } = await supabase
      .from('components')
      .insert([headphoneData])
      .select()
    
    if (error) {
      console.error('❌ Error inserting:', error)
      return
    }
    
    if (data && data.length > 0) {
      console.log('✅ Successfully added ${brand} ${model}!')
      console.log(\`   ID: \${data[0].id}\`)
      console.log(\`   Name: \${data[0].brand} \${data[0].name}\`)
      console.log(\`   Category: \${data[0].category}\`)
      console.log(\`   Price: $\${data[0].price_new} MSRP, $\${data[0].price_used_min}-\${data[0].price_used_max} used\`)
    }
    
  } catch (err) {
    console.error('❌ Failed to add ${brand} ${model}:', err.message)
  }
}

if (require.main === module) {
  addHeadphone()
}

module.exports = { addHeadphone }
`

    await fs.writeFile(scriptPath, scriptContent)
    console.log(`📝 Generated script: ${scriptPath}`)
    return scriptPath
  }

  // Main automation workflow
  async handleMissingHeadphone(brand, model, category = 'cans', autoResearch = false) {
    console.log(`🔍 Processing: ${brand} ${model}`)
    
    // Check if already exists
    const existsCheck = await this.checkExists(brand, model, category)
    if (existsCheck.exactMatch) {
      console.log(`✅ ${brand} ${model} already exists in database`)
      return { status: 'exists', data: existsCheck.exactMatch }
    }
    
    if (existsCheck.matches && existsCheck.matches.length > 0) {
      console.log(`🔍 Found similar entries:`)
      existsCheck.matches.forEach(match => {
        console.log(`   - ${match.brand} ${match.name}`)
      })
    }
    
    // Generate addition script
    const scriptPath = await this.generateAdditionScript(brand, model, category)
    
    // If auto-research is enabled, attempt to gather data
    if (autoResearch) {
      console.log('🤖 Auto-research feature not yet implemented')
      // TODO: Implement web scraping for common sources
    }
    
    return { 
      status: 'missing', 
      scriptPath,
      similar: existsCheck.matches || []
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.log('Usage: node missing-headphones-automation.js <brand> <model> [category] [--auto-research]')
    console.log('Example: node missing-headphones-automation.js "Focal" "Utopia" "cans"')
    process.exit(1)
  }
  
  const [brand, model, category = 'cans'] = args
  const autoResearch = args.includes('--auto-research')
  
  const handler = new MissingHeadphoneHandler()
  const result = await handler.handleMissingHeadphone(brand, model, category, autoResearch)
  
  console.log('\\n📊 Result:', result)
  
  if (result.status === 'missing') {
    console.log('\\n📋 Next Steps:')
    console.log('1. Research the headphone specifications and pricing')
    console.log('2. Edit the generated script to fill in accurate data')
    console.log('3. Run the script to add to database')
    console.log(`4. Script location: ${result.scriptPath}`)
  }
}

if (require.main === module) {
  main()
}

module.exports = { MissingHeadphoneHandler }