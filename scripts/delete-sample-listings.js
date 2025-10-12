/**
 * Delete sample/demo listings from the database
 * Only deletes listings with URLs containing 'sample' or 'demo'
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deleteSampleListings() {
  console.log('🔍 Finding sample listings...')

  // Find all listings with sample/demo URLs
  const { data: sampleListings, error: findError } = await supabase
    .from('used_listings')
    .select('id, url, title')
    .or('url.ilike.%sample%,url.ilike.%demo%')

  if (findError) {
    console.error('❌ Error finding sample listings:', findError)
    process.exit(1)
  }

  if (!sampleListings || sampleListings.length === 0) {
    console.log('✅ No sample listings found!')
    return
  }

  console.log(`📋 Found ${sampleListings.length} sample listings:`)
  sampleListings.forEach(listing => {
    console.log(`  - ${listing.title.substring(0, 60)}... (${listing.url})`)
  })

  // Delete them
  console.log('\n🗑️  Deleting sample listings...')
  const { error: deleteError } = await supabase
    .from('used_listings')
    .delete()
    .or('url.ilike.%sample%,url.ilike.%demo%')

  if (deleteError) {
    console.error('❌ Error deleting sample listings:', deleteError)
    process.exit(1)
  }

  console.log(`✅ Successfully deleted ${sampleListings.length} sample listings!`)
}

deleteSampleListings()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
