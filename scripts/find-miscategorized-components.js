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

console.log('🔍 Searching for likely miscategorized components...\n')

// Query for items that are likely miscategorized as IEMs (but are actually cans)
const { data: suspectedIems, error: iemsError } = await supabase
  .from('components')
  .select('id, brand, name, category, driver_type')
  .eq('category', 'iems')
  .or('name.like.ATH-%,name.like.HD%,name.like.MDR-%,name.like.K7%,name.like.Momentum%,brand.eq.Massdrop x AKG,name.like.HD25%')
  .order('brand')
  .limit(100)

if (iemsError) {
  console.error('Error querying IEMs:', iemsError)
  process.exit(1)
}

console.log(`\n📊 Found ${suspectedIems.length} items marked as IEMs but likely over-ear/on-ear headphones:\n`)
suspectedIems.forEach(item => {
  console.log(`  - ${item.brand} ${item.name || '(no name)'} [ID: ${item.id}]`)
})

// Also check for items miscategorized as cans (but are actually IEMs)
// Common IEM naming patterns: numbers, "Pro", single letters
const { data: suspectedCans, error: cansError } = await supabase
  .from('components')
  .select('id, brand, name, category, driver_type')
  .eq('category', 'cans')
  .eq('driver_type', 'BA') // Balanced Armature is IEM-only
  .limit(100)

if (!cansError && suspectedCans.length > 0) {
  console.log(`\n📊 Found ${suspectedCans.length} items marked as cans but have BA drivers (IEMs):\n`)
  suspectedCans.forEach(item => {
    console.log(`  - ${item.brand} ${item.name || '(no name)'} [ID: ${item.id}]`)
  })
}

console.log('\n✅ Analysis complete!')
