// Populate Amazon URLs for components
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Amazon affiliate tag (replace with your actual tag)
const AFFILIATE_TAG = 'hifinder-20'

function generateAmazonUrl(brand, name, category) {
  // Clean up the product name for search
  let searchTerm = `${brand} ${name}`
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
  
  // Add category context for better search results
  if (category === 'cans') {
    searchTerm += ' headphones'
  } else if (category === 'iems') {
    searchTerm += ' earphones'
  } else if (category === 'dac_amp') {
    searchTerm += ' DAC amplifier'
  } else if (category === 'dac') {
    searchTerm += ' DAC'
  } else if (category === 'amp') {
    searchTerm += ' headphone amplifier'
  }
  
  // Encode for URL
  const encodedSearch = encodeURIComponent(searchTerm)
  
  // Generate Amazon search URL with affiliate tag
  return `https://www.amazon.com/s?k=${encodedSearch}&tag=${AFFILIATE_TAG}`
}

// Special cases where we know specific Amazon products exist
const knownAmazonProducts = {
  'Sennheiser HD600': 'https://www.amazon.com/dp/B00004SY4H?tag=' + AFFILIATE_TAG,
  'Sennheiser HD650': 'https://www.amazon.com/dp/B00018MSNI?tag=' + AFFILIATE_TAG,
  'Sennheiser HD800S': 'https://www.amazon.com/dp/B01FI1BRHM?tag=' + AFFILIATE_TAG,
  'Audio-Technica ATH-M50x': 'https://www.amazon.com/dp/B00HVLUR86?tag=' + AFFILIATE_TAG,
  'Beyerdynamic DT770 Pro': 'https://www.amazon.com/dp/B0006NL5SM?tag=' + AFFILIATE_TAG,
  'Beyerdynamic DT990 Pro': 'https://www.amazon.com/dp/B0011UB9CQ?tag=' + AFFILIATE_TAG,
  'HiFiMAN Sundara': 'https://www.amazon.com/dp/B077XBQZPX?tag=' + AFFILIATE_TAG,
  'Philips SHP9500': 'https://www.amazon.com/dp/B00ENMK1DW?tag=' + AFFILIATE_TAG,
  'Sony WH-1000XM4': 'https://www.amazon.com/dp/B0863TXGM3?tag=' + AFFILIATE_TAG,
  'Focal Clear': 'https://www.amazon.com/dp/B077XDNAFC?tag=' + AFFILIATE_TAG,
  'Audeze LCD-X': 'https://www.amazon.com/dp/B00J5JBQZ2?tag=' + AFFILIATE_TAG,
  'Schiit Magni': 'https://www.amazon.com/dp/B07NPDP9K1?tag=' + AFFILIATE_TAG,
  'Schiit Modi': 'https://www.amazon.com/dp/B07NP6JRZX?tag=' + AFFILIATE_TAG,
  'JDS Labs Atom Amp+': 'https://www.amazon.com/dp/B09NTL1TYT?tag=' + AFFILIATE_TAG,
  'Topping DX3 Pro+': 'https://www.amazon.com/dp/B08BGLXZ8H?tag=' + AFFILIATE_TAG
}

async function populateAmazonUrls() {
  console.log('🔗 Populating Amazon URLs for components...')
  
  try {
    // Get all components without Amazon URLs
    const { data: components, error } = await supabase
      .from('components')
      .select('id, name, brand, category, amazon_url')
      .is('amazon_url', null)
    
    if (error) {
      console.error('Error fetching components:', error)
      return
    }
    
    console.log(`Found ${components.length} components without Amazon URLs`)
    
    let successCount = 0
    let errorCount = 0
    
    for (const component of components) {
      const productKey = `${component.brand} ${component.name}`
      
      // Check if we have a known direct Amazon URL
      let amazonUrl = knownAmazonProducts[productKey]
      
      // If not, generate a search URL
      if (!amazonUrl) {
        amazonUrl = generateAmazonUrl(component.brand, component.name, component.category)
      }
      
      // Update the component
      const { error: updateError } = await supabase
        .from('components')
        .update({ amazon_url: amazonUrl })
        .eq('id', component.id)
      
      if (updateError) {
        console.error(`❌ Error updating ${component.name}:`, updateError.message)
        errorCount++
      } else {
        console.log(`✅ ${component.name} (${component.brand})`)
        successCount++
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    console.log(`\n📊 Results:`)
    console.log(`✅ Successfully updated: ${successCount} components`)
    console.log(`❌ Failed to update: ${errorCount} components`)
    
    // Show some examples
    console.log(`\n🔗 Example URLs generated:`)
    const examples = components.slice(0, 5)
    for (const comp of examples) {
      const productKey = `${comp.brand} ${comp.name}`
      const url = knownAmazonProducts[productKey] || generateAmazonUrl(comp.brand, comp.name, comp.category)
      console.log(`  ${comp.name}: ${url.substring(0, 80)}...`)
    }
    
  } catch (err) {
    console.error('❌ Failed to populate Amazon URLs:', err)
  }
}

async function main() {
  console.log('🚀 Starting Amazon URL population...')
  await populateAmazonUrls()
  console.log('\n✨ Amazon URL population complete!')
  console.log('\n📝 Note: URLs are affiliate-ready with tag "hifinder-20"')
  console.log('💡 Known products use direct links, others use search URLs for best compatibility')
}

if (require.main === module) {
  main()
}

module.exports = { populateAmazonUrls }