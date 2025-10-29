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

console.log('🔧 Fixing HarmonicDyne Helios brand name\n')

const { error } = await supabase
  .from('components')
  .update({
    brand: 'HarmonicDyne',
    name: 'Helios'
  })
  .eq('id', 'fd8daf38-e882-4ee4-a861-f82a2b6a463b')

if (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

console.log('✅ Successfully updated:')
console.log('   Brand: "Symphonium" → "HarmonicDyne"')
console.log('   Name: "HarmonicDyne Helios" → "Helios"')
console.log('\nThis separates the incorrectly merged brand names.')
console.log('Symphonium Helios is a different product (4BA IEM).')
