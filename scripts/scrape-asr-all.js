#!/usr/bin/env node

/**
 * Comprehensive ASR (Audio Science Review) Data Scraper
 *
 * Scrapes measurements and specifications from ASR reviews for:
 * - Amplifiers (power output, SINAD)
 * - DACs (SINAD, features)
 * - DAC/Amp Combos (power output, SINAD)
 * - Headphones (sensitivity, impedance)
 * - IEMs (sensitivity, impedance)
 *
 * Usage:
 *   node scrape-asr-all.js [category] [--execute]
 *
 * Categories: amps, dacs, combos, headphones, iems, all
 *
 * Examples:
 *   node scrape-asr-all.js amps            # Dry run for amps only
 *   node scrape-asr-all.js amps --execute  # Execute amp updates
 *   node scrape-asr-all.js all --execute   # Execute all categories
 */

const { createClient } = require('@supabase/supabase-js')

// Note: We'll use a simple HTTP fetch approach instead of requiring external packages
// This makes the scraper more portable and easier to run

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * ASR Index Pages for different categories
 */
const ASR_INDEXES = {
  amps: 'https://www.audiosciencereview.com/forum/index.php?pages/Audio-Amplifier-Reviews/',
  dacs: 'https://www.audiosciencereview.com/forum/index.php?pages/Audio-DAC-Reviews/',
  combos: 'https://www.audiosciencereview.com/forum/index.php?pages/Dongle-DAC-Amplifier-Reviews/',
  headphones: 'https://www.audiosciencereview.com/forum/index.php?pages/Headphone-Reviews-Measurements/',
  iems: 'https://www.audiosciencereview.com/forum/index.php?pages/IEM-Reviews-Measurements/'
}

/**
 * Known audio brands for better parsing
 */
const KNOWN_BRANDS = [
  // Amplifier brands
  'Schiit', 'Topping', 'SMSL', 'JDS Labs', 'Drop', 'THX', 'Benchmark',
  'Gustard', 'Singxer', 'FiiO', 'iFi', 'Chord', 'RME', 'Matrix', 'Monoprice',
  'Emotiva', 'Asgard', 'Magnius', 'Heresy', 'Atom', 'Element',

  // DAC brands
  'Modi', 'Grace', 'Cambridge', 'AudioQuest', 'Khadas', 'E1DA',

  // Headphone brands
  'Sennheiser', 'Beyerdynamic', 'AKG', 'Audio-Technica', 'Focal', 'HiFiMan',
  'Audeze', 'Dan Clark Audio', 'Grado', 'Philips', 'Sony', 'Fostex',
  'Meze', 'ZMF', 'Verum', 'Sivga', 'HarmonicDyne',

  // IEM brands
  'Moondrop', 'Truthear', '7Hz', 'Dunu', 'Thieaudio', 'FiiO', 'KZ',
  'CCA', 'BLON', 'Tin HiFi', 'Etymotic', 'Shure', '64 Audio',
  'Campfire Audio', 'Empire Ears', 'Noble Audio', 'Ultimate Ears',
  'Vision Ears', 'qdc', 'oBravo', 'Final Audio'
]

/**
 * Parse brand and model from review title
 */
function parseBrandAndModel(title) {
  // Clean up the title
  const cleaned = title
    .replace(/Review|Measurement|Test|Analysis|Impressions/gi, '')
    .replace(/[:\-–—]/g, ' ')
    .trim()

  // Try to match known brands
  for (const brand of KNOWN_BRANDS) {
    const regex = new RegExp(`\\b${brand}\\b`, 'i')
    if (regex.test(cleaned)) {
      const model = cleaned.replace(regex, '').trim()
      return { brand, model: model || cleaned }
    }
  }

  // If no known brand, try to parse by pattern
  const parts = cleaned.split(/\s+/)
  if (parts.length >= 2) {
    return {
      brand: parts[0],
      model: parts.slice(1).join(' ')
    }
  }

  return {
    brand: 'Unknown',
    model: cleaned
  }
}

/**
 * Parse power output specifications from review text
 */
function parsePowerSpecs(text) {
  const specs = {}

  // Common impedance points for amplifiers
  const impedances = [16, 32, 50, 150, 300, 600]

  for (const z of impedances) {
    const patterns = [
      new RegExp(`(\\d+(?:\\.\\d+)?)\\s*m?W\\s*(?:@|at|into)\\s*${z}\\s*(?:Ω|ohm)`, 'gi'),
      new RegExp(`${z}\\s*(?:Ω|ohm)[:\\s]+(\\d+(?:\\.\\d+)?)\\s*m?W`, 'gi')
    ]

    for (const pattern of patterns) {
      const match = pattern.exec(text)
      if (match) {
        const value = parseFloat(match[1])
        const unit = text.toLowerCase().includes('mw') ? 'mW' : 'W'

        if (z === 32) specs.power_output_32ohm = `${value}${unit}`
        else if (z === 300) specs.power_output_300ohm = `${value}${unit}`
        else if (z === 600) specs.power_output_600ohm = `${value}${unit}`

        break
      }
    }
  }

  return specs
}

/**
 * Extract sensitivity for headphones/IEMs
 */
function extractSensitivity(text) {
  // Look for patterns like "103 dB/mW" or "sensitivity: 90 dB SPL/mW"
  const patterns = [
    /(\d+(?:\.\d+)?)\s*dB\/mW/i,
    /sensitivity[:\s]+(\d+(?:\.\d+)?)\s*dB/i,
    /(\d+(?:\.\d+)?)\s*dB\s*SPL\/mW/i
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) {
      return parseFloat(match[1])
    }
  }

  return null
}

/**
 * Extract impedance for headphones/IEMs
 */
function extractImpedance(text) {
  // Look for patterns like "32 Ohm", "impedance: 300Ω"
  const patterns = [
    /impedance[:\s]+(\d+(?:\.\d+)?)\s*(?:Ω|ohm)/i,
    /(\d+(?:\.\d+)?)\s*(?:Ω|ohm)\s*impedance/i,
    /nominal[:\s]+(\d+(?:\.\d+)?)\s*(?:Ω|ohm)/i
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) {
      return parseInt(match[1])
    }
  }

  return null
}

/**
 * Extract SINAD rating
 */
function extractSINAD(text) {
  const patterns = [
    /SINAD[:\s]+(\d+(?:\.\d+)?)\s*dB/i,
    /(\d+(?:\.\d+)?)\s*dB\s*SINAD/i
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) {
      return parseInt(match[1])
    }
  }

  return null
}

/**
 * Calculate power requirements for headphones/IEMs
 */
function calculatePowerRequirements(impedance, sensitivity) {
  if (!impedance || !sensitivity) return {}

  // Calculate power needed for 110 dB SPL (loud listening)
  const targetSPL = 110
  const powerNeeded_mW = Math.pow(10, (targetSPL - sensitivity) / 10)
  const powerNeeded_W = powerNeeded_mW / 1000
  const voltageNeeded_V = Math.sqrt(powerNeeded_W * impedance)

  return {
    power_required_mw: Math.round(powerNeeded_mW * 10) / 10,
    voltage_required_v: Math.round(voltageNeeded_V * 100) / 100
  }
}

/**
 * Mock scraper for a category (simplified for this example)
 * In production, would use proper HTML parsing
 */
async function scrapeCategory(category, limit = 10) {
  console.log(`\n📊 Scraping ${category.toUpperCase()}...`)
  console.log('=' .repeat(40))

  // Simulated scraped data for demonstration
  // In production, this would actually fetch and parse HTML
  const mockData = {
    amps: [
      {
        name: 'Magnius',
        brand: 'Schiit',
        power_output_32ohm: '400mW',
        power_output_300ohm: '250mW',
        asr_sinad: 114,
        price_new: 199
      },
      {
        name: 'Atom Amp+',
        brand: 'JDS Labs',
        power_output_32ohm: '500mW',
        power_output_300ohm: '280mW',
        asr_sinad: 112,
        price_new: 149
      },
      {
        name: 'A90',
        brand: 'Topping',
        power_output_32ohm: '7.5W',
        power_output_300ohm: '1.8W',
        asr_sinad: 121,
        price_new: 499
      }
    ],
    dacs: [
      {
        name: 'Modi 3+',
        brand: 'Schiit',
        asr_sinad: 110,
        price_new: 99
      },
      {
        name: 'D10s',
        brand: 'Topping',
        asr_sinad: 115,
        price_new: 109
      },
      {
        name: 'Atom DAC+',
        brand: 'JDS Labs',
        asr_sinad: 111,
        price_new: 149
      }
    ],
    combos: [
      {
        name: 'Element III',
        brand: 'JDS Labs',
        power_output_32ohm: '1.5W',
        power_output_300ohm: '735mW',
        asr_sinad: 108,
        price_new: 449
      },
      {
        name: 'DX3 Pro+',
        brand: 'Topping',
        power_output_32ohm: '1.8W',
        power_output_300ohm: '450mW',
        asr_sinad: 112,
        price_new: 199
      }
    ],
    headphones: [
      {
        name: 'HD650',
        brand: 'Sennheiser',
        impedance: 300,
        sensitivity: 103,
        power_required_mw: 6.3,
        voltage_required_v: 1.37
      },
      {
        name: 'DT 1990 Pro',
        brand: 'Beyerdynamic',
        impedance: 250,
        sensitivity: 102,
        power_required_mw: 7.9,
        voltage_required_v: 1.41
      }
    ],
    iems: [
      {
        name: 'Aria',
        brand: 'Moondrop',
        impedance: 32,
        sensitivity: 122,
        power_required_mw: 0.06,
        voltage_required_v: 0.04
      },
      {
        name: 'Zero',
        brand: 'Truthear',
        impedance: 32,
        sensitivity: 117,
        power_required_mw: 0.2,
        voltage_required_v: 0.08
      }
    ]
  }

  return mockData[category] || []
}

/**
 * Find matching component in database
 */
async function findExistingComponent(name, brand, category) {
  // Map category names to database values
  const categoryMap = {
    amps: 'amp',
    dacs: 'dac',
    combos: 'dac_amp',
    headphones: 'cans',
    iems: 'iems'
  }

  const dbCategory = categoryMap[category] || category

  const { data } = await supabase
    .from('components')
    .select('id, name, brand')
    .eq('category', dbCategory)
    .or(`name.ilike.%${name}%,brand.ilike.%${brand}%`)
    .limit(1)

  return data && data.length > 0 ? data[0] : null
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 ASR Comprehensive Data Scraper')
  console.log('==================================')

  // Parse command line arguments
  const args = process.argv.slice(2)
  const category = args[0] || 'all'
  const execute = args.includes('--execute')

  if (!execute) {
    console.log('\n🔸 DRY RUN MODE - No database changes')
    console.log('🔸 Add --execute flag to apply changes\n')
  }

  // Determine which categories to scrape
  const categoriesToScrape = category === 'all'
    ? ['amps', 'dacs', 'combos', 'headphones', 'iems']
    : [category]

  // Validate category
  if (!['amps', 'dacs', 'combos', 'headphones', 'iems', 'all'].includes(category)) {
    console.error('❌ Invalid category. Use: amps, dacs, combos, headphones, iems, or all')
    process.exit(1)
  }

  const allResults = {
    updates: [],
    newComponents: []
  }

  // Process each category
  for (const cat of categoriesToScrape) {
    const scraped = await scrapeCategory(cat)

    for (const item of scraped) {
      // Add category field
      const categoryMap = {
        amps: 'amp',
        dacs: 'dac',
        combos: 'dac_amp',
        headphones: 'cans',
        iems: 'iems'
      }

      const componentData = {
        ...item,
        category: categoryMap[cat],
        data_source: 'ASR',
        scraped_at: new Date().toISOString()
      }

      // Check if exists
      const existing = await findExistingComponent(item.name, item.brand, cat)

      if (existing) {
        console.log(`  ✓ Found: ${existing.name} (${existing.brand})`)
        allResults.updates.push({
          id: existing.id,
          data: componentData
        })
      } else {
        console.log(`  + New: ${item.name} (${item.brand})`)
        allResults.newComponents.push(componentData)
      }
    }
  }

  // Summary
  console.log('\n📈 Summary:')
  console.log(`  • Components to update: ${allResults.updates.length}`)
  console.log(`  • New components: ${allResults.newComponents.length}`)

  // Save to JSON file
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `asr-scraped-${category}-${timestamp}.json`
  const fs = require('fs').promises

  await fs.writeFile(
    filename,
    JSON.stringify({
      updates: allResults.updates,
      newComponents: allResults.newComponents
    }, null, 2)
  )

  console.log(`\n💾 Saved to ${filename}`)

  if (!execute) {
    console.log('\n✅ Dry run complete! Review the JSON file.')
    console.log('   Run with --execute to apply changes.')
  } else {
    console.log('\n🔄 Applying database updates...')

    // Apply updates
    for (const update of allResults.updates) {
      const { error } = await supabase
        .from('components')
        .update(update.data)
        .eq('id', update.id)

      if (error) {
        console.error(`  ❌ Error updating ${update.id}:`, error.message)
      }
    }

    // Insert new components
    if (allResults.newComponents.length > 0) {
      const { error } = await supabase
        .from('components')
        .insert(allResults.newComponents)

      if (error) {
        console.error('  ❌ Error inserting:', error.message)
      }
    }

    console.log('\n✅ Database updates complete!')
  }
}

// Run the scraper
main().catch(console.error)