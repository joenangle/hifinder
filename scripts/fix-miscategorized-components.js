import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Items to recategorize from 'iems' to 'cans'
const iemsToRecategorize = [
  '72f0ea53-6a65-4a8a-b486-47dc93c15ac8', // ATH-M70x
  'cad8f199-37fd-49a4-b136-c9672048cd72', // ATH-M40x
  'a4f91603-d7ec-4662-bf40-9ef81071aa71', // Massdrop x AKG K7XX
  '6d675320-1bfc-405e-afac-b4351961676b', // Sennheiser Momentum 3 Wireless
  '1bf78f29-13e6-4e2c-80b2-e8b43d59975b', // Sennheiser HD 560S
  '0680178a-b3c4-40f8-a1fd-7bfd44eed24e', // Sennheiser HD25 Plus
  'ed3223a8-14cd-421b-a8c6-37230bc7ed0c', // Sony MDR-AS800AP
  'f9e84df0-ad35-43da-8ffd-a88338fcbae2', // Sony MDR-1AM2
  'c33a3371-7c68-4014-a244-bca2c17d4e23', // Sony MDR-CD380
]

const dryRun = !process.argv.includes('--execute')

if (dryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made')
  console.log('   Run with --execute flag to apply changes\n')
} else {
  console.log('⚠️  EXECUTE MODE - Changes will be applied!\n')
}

// Fetch current data for these items
const { data: currentData, error: fetchError } = await supabase
  .from('components')
  .select('id, brand, name, category')
  .in('id', iemsToRecategorize)

if (fetchError) {
  console.error('Error fetching components:', fetchError)
  process.exit(1)
}

console.log(`Found ${currentData.length} components to recategorize:\n`)
currentData.forEach(item => {
  console.log(`  ✏️  ${item.brand} ${item.name}`)
  console.log(`      Current: ${item.category} → New: cans`)
  console.log(`      ID: ${item.id}\n`)
})

if (!dryRun) {
  console.log('Applying changes...\n')

  for (const id of iemsToRecategorize) {
    const { error: updateError } = await supabase
      .from('components')
      .update({ category: 'cans' })
      .eq('id', id)

    if (updateError) {
      console.error(`❌ Error updating ${id}:`, updateError)
    } else {
      const item = currentData.find(i => i.id === id)
      console.log(`✅ Updated: ${item.brand} ${item.name}`)
    }
  }

  console.log(`\n✅ Successfully recategorized ${iemsToRecategorize.length} components from IEMs to cans!`)
} else {
  console.log('💡 To apply these changes, run: node scripts/fix-miscategorized-components.js --execute')
}
