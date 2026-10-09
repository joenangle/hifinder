import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

console.log('Fixing AKG K371...\n')

// Fix K371
const { error } = await supabase
  .from('components')
  .update({ category: 'cans' })
  .eq('id', '5b20a0e7-8e8f-4de4-9ba4-0daaf1afc8b3')

if (error) {
  console.error('Error:', error)
} else {
  console.log('✅ Fixed: AKG K371 → category: cans')
}

// Check for other potentially miscategorized AKG products
const { data } = await supabase
  .from('components')
  .select('id, brand, name, category')
  .eq('brand', 'AKG')
  .eq('category', 'iems')

console.log('\nOther AKG items still marked as IEMs:')
if (data.length === 0) {
  console.log('  (none found)')
} else {
  data.forEach(item => console.log(`  - ${item.name} [${item.id}]`))
}
