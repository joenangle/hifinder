#!/usr/bin/env node

/**
 * ASR (Audio Science Review) Amplifier Data Scraper
 *
 * Scrapes amplifier measurements and specifications from ASR reviews
 * Outputs structured data ready for database import
 *
 * Priority order: Amps → DACs → Combos → Headphones/IEMs
 */

const { createClient } = require('@supabase/supabase-js')
const fetch = require('node-fetch')
const cheerio = require('cheerio')
const fs = require('fs').promises

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * ASR Amplifier Index Page
 * This page lists all reviewed amplifiers with links to individual reviews
 */
const ASR_AMP_INDEX = 'https://www.audiosciencereview.com/forum/index.php?pages/Audio-Amplifier-Reviews/'

/**
 * Parse power output specifications from review text
 * Looks for patterns like "400mW @ 32Ω", "5W into 8Ω", etc.
 */
function parsePowerSpecs(text) {
  const powerSpecs = {
    power_output_32ohm: null,
    power_output_300ohm: null,
    power_output_600ohm: null
  }

  // Regex patterns for power specifications
  const patterns = [
    // "400mW @ 32Ω" or "400mW at 32 ohms"
    /(\d+(?:\.\d+)?)\s*(?:m)?W\s*(?:@|at|into)\s*32\s*(?:Ω|ohm)/gi,
    /(\d+(?:\.\d+)?)\s*(?:m)?W\s*(?:@|at|into)\s*300\s*(?:Ω|ohm)/gi,
    /(\d+(?:\.\d+)?)\s*(?:m)?W\s*(?:@|at|into)\s*600\s*(?:Ω|ohm)/gi,
  ]

  // Find 32Ω power
  const match32 = patterns[0].exec(text)
  if (match32) {
    const value = parseFloat(match32[1])
    const unit = text.includes('mW') ? 'mW' : 'W'
    powerSpecs.power_output_32ohm = `${value}${unit}`
  }

  // Find 300Ω power
  const match300 = patterns[1].exec(text)
  if (match300) {
    const value = parseFloat(match300[1])
    const unit = text.includes('mW') ? 'mW' : 'W'
    powerSpecs.power_output_300ohm = `${value}${unit}`
  }

  // Find 600Ω power
  const match600 = patterns[2].exec(text)
  if (match600) {
    const value = parseFloat(match600[1])
    const unit = text.includes('mW') ? 'mW' : 'W'
    powerSpecs.power_output_600ohm = `${value}${unit}`
  }

  return powerSpecs
}

/**
 * Extract SINAD (Signal-to-Noise and Distortion) rating
 * ASR's primary performance metric
 */
function extractSINAD(text) {
  // Look for "SINAD: 114 dB" or similar patterns
  const sinadPattern = /SINAD[:\s]+(\d+(?:\.\d+)?)\s*dB/i
  const match = sinadPattern.exec(text)
  return match ? parseInt(match[1]) : null
}

/**
 * Extract price information
 */
function extractPrice(text) {
  // Look for "$199" or "USD 199" patterns
  const pricePattern = /\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/
  const match = pricePattern.exec(text)
  return match ? parseFloat(match[1].replace(',', '')) : null
}

/**
 * Scrape individual amplifier review page
 */
async function scrapeAmplifierReview(url, name, brand) {
  try {
    console.log(`  📖 Scraping review: ${name}`)

    const response = await fetch(url)
    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract the main review content
    const reviewContent = $('.message-body').first().text()

    // Parse specifications
    const powerSpecs = parsePowerSpecs(reviewContent)
    const sinad = extractSINAD(reviewContent)
    const price = extractPrice(reviewContent)

    // Find product image (usually in the first post)
    const imageUrl = $('.message-body img').first().attr('src') || null

    return {
      name,
      brand,
      category: 'amp',
      price_new: price,
      ...powerSpecs,
      asr_sinad: sinad,
      image_url: imageUrl,
      data_source: 'ASR',
      review_url: url,
      scraped_at: new Date().toISOString()
    }
  } catch (error) {
    console.error(`  ❌ Error scraping ${name}:`, error.message)
    return null
  }
}

/**
 * Scrape ASR amplifier index page
 */
async function scrapeAmplifierIndex() {
  console.log('🔍 Fetching ASR amplifier index...')

  try {
    const response = await fetch(ASR_AMP_INDEX)
    const html = await response.text()
    const $ = cheerio.load(html)

    const amplifiers = []

    // Find all review links
    $('.structItem-title a').each((i, elem) => {
      const $link = $(elem)
      const title = $link.text().trim()
      const url = 'https://www.audiosciencereview.com' + $link.attr('href')

      // Parse brand and model from title
      // Format is usually "Brand Model Review" or "Review: Brand Model"
      const titleParts = title.replace(/Review|Measurement|Test/gi, '').trim()

      // Common brand patterns
      const knownBrands = [
        'Schiit', 'Topping', 'SMSL', 'JDS Labs', 'Drop', 'THX', 'Benchmark',
        'Gustard', 'Singxer', 'FiiO', 'iFi', 'Chord', 'RME', 'Matrix'
      ]

      let brand = 'Unknown'
      let model = titleParts

      for (const knownBrand of knownBrands) {
        if (titleParts.toLowerCase().includes(knownBrand.toLowerCase())) {
          brand = knownBrand
          model = titleParts.replace(new RegExp(knownBrand, 'i'), '').trim()
          break
        }
      }

      amplifiers.push({
        name: model,
        brand: brand,
        url: url
      })
    })

    console.log(`✅ Found ${amplifiers.length} amplifier reviews`)
    return amplifiers
  } catch (error) {
    console.error('❌ Error fetching index:', error)
    return []
  }
}

/**
 * Match scraped amplifier with existing database entry
 */
async function findExistingComponent(name, brand) {
  const { data } = await supabase
    .from('components')
    .select('id, name, brand')
    .eq('category', 'amp')
    .or(`name.ilike.%${name}%,brand.ilike.%${brand}%`)
    .limit(1)

  return data && data.length > 0 ? data[0] : null
}

/**
 * Main scraper function
 */
async function main() {
  console.log('🚀 Starting ASR Amplifier Scraper')
  console.log('================================\n')

  // Check for dry run flag
  const isDryRun = !process.argv.includes('--execute')

  if (isDryRun) {
    console.log('🔸 DRY RUN MODE - No database changes will be made')
    console.log('🔸 To execute updates, run with --execute flag\n')
  }

  // Scrape amplifier index
  const amplifiers = await scrapeAmplifierIndex()

  if (amplifiers.length === 0) {
    console.log('❌ No amplifiers found to scrape')
    return
  }

  // Limit to first 20 for initial testing
  const ampsToProcess = amplifiers.slice(0, 20)
  console.log(`\n📊 Processing ${ampsToProcess.length} amplifiers...\n`)

  const scrapedData = []
  const updates = []
  const newComponents = []

  for (const amp of ampsToProcess) {
    const data = await scrapeAmplifierReview(amp.url, amp.name, amp.brand)

    if (data) {
      scrapedData.push(data)

      // Check if component exists in database
      const existing = await findExistingComponent(data.name, data.brand)

      if (existing) {
        console.log(`  ✓ Found existing: ${existing.name} (${existing.brand})`)
        updates.push({
          id: existing.id,
          updates: {
            power_output_32ohm: data.power_output_32ohm,
            power_output_300ohm: data.power_output_300ohm,
            power_output_600ohm: data.power_output_600ohm,
            asr_sinad: data.asr_sinad,
            price_new: data.price_new || existing.price_new
          }
        })
      } else {
        console.log(`  + New component: ${data.name} (${data.brand})`)
        newComponents.push(data)
      }
    }

    // Rate limiting - be nice to ASR's servers
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Save scraped data to JSON file
  const outputFile = `asr-amps-${new Date().toISOString().split('T')[0]}.json`
  await fs.writeFile(outputFile, JSON.stringify(scrapedData, null, 2))
  console.log(`\n💾 Saved scraped data to ${outputFile}`)

  // Summary
  console.log('\n📈 Summary:')
  console.log(`  • Total scraped: ${scrapedData.length}`)
  console.log(`  • Existing components to update: ${updates.length}`)
  console.log(`  • New components to add: ${newComponents.length}`)

  if (isDryRun) {
    console.log('\n🔸 DRY RUN COMPLETE - No database changes were made')
    console.log('🔸 Review the output file and run with --execute to apply changes')
  } else {
    console.log('\n🔄 Applying database updates...')

    // Update existing components
    for (const update of updates) {
      const { error } = await supabase
        .from('components')
        .update(update.updates)
        .eq('id', update.id)

      if (error) {
        console.error(`  ❌ Error updating ${update.id}:`, error.message)
      } else {
        console.log(`  ✓ Updated component ${update.id}`)
      }
    }

    // Insert new components
    if (newComponents.length > 0) {
      const { error } = await supabase
        .from('components')
        .insert(newComponents)

      if (error) {
        console.error('  ❌ Error inserting new components:', error.message)
      } else {
        console.log(`  ✓ Inserted ${newComponents.length} new components`)
      }
    }

    console.log('\n✅ Database updates complete!')
  }
}

// Run the scraper
main().catch(console.error)