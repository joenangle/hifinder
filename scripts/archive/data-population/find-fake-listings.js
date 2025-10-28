/**
 * Find and optionally delete fake/test listings from database
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

async function findFakeListings() {
  console.log('🔍 Finding fake/test listings...\n')

  const { data: listings, error } = await supabase
    .from('used_listings')
    .select('id, url, title, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error fetching listings:', error)
    process.exit(1)
  }

  // Find listings with fake/shortened URLs
  const fakeUrls = listings.filter(l => {
    // Missing www.reddit.com (should have full URL)
    if (!l.url.includes('www.reddit.com')) return true

    // Has /sample or /demo in URL
    if (l.url.includes('/sample') || l.url.includes('/demo')) return true

    // Has fake comment ID (ends with underscores or all lowercase words)
    if (l.url.match(/comments\/[a-z_]+$/)) return true

    return false
  })

  console.log(`📊 Results:`)
  console.log(`   Total listings: ${listings.length}`)
  console.log(`   Real listings: ${listings.length - fakeUrls.length}`)
  console.log(`   Fake/test listings: ${fakeUrls.length}\n`)

  if (fakeUrls.length > 0) {
    console.log(`📋 Fake/test listings found:\n`)
    fakeUrls.forEach((l, i) => {
      console.log(`${i + 1}. ${l.url}`)
      console.log(`   Title: ${l.title.substring(0, 70)}`)
      console.log(`   ID: ${l.id}`)
      console.log(`   Created: ${new Date(l.created_at).toLocaleString()}\n`)
    })
  } else {
    console.log('✅ No fake listings found!')
  }

  return fakeUrls
}

async function deleteFakeListings(fakeListings) {
  console.log(`\n🗑️  Deleting ${fakeListings.length} fake listings...`)

  const ids = fakeListings.map(l => l.id)

  const { error } = await supabase
    .from('used_listings')
    .delete()
    .in('id', ids)

  if (error) {
    console.error('❌ Error deleting listings:', error)
    process.exit(1)
  }

  console.log(`✅ Successfully deleted ${fakeListings.length} fake listings!`)
}

async function main() {
  const fakeListings = await findFakeListings()

  // Check if --delete flag was passed
  if (process.argv.includes('--delete')) {
    if (fakeListings.length > 0) {
      await deleteFakeListings(fakeListings)
    }
  } else if (fakeListings.length > 0) {
    console.log('\n💡 To delete these listings, run: node scripts/find-fake-listings.js --delete')
  }

  console.log('\n✨ Done!')
  process.exit(0)
}

main().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
