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

const FLAGGED_IDS = [
  '261ef6f1-506a-4323-915b-c33085615255', // A&K T8iE
  '09cd48e5-0406-47d9-a031-0226d2aa5efd', // Audeze Euclid
  '9f91ca11-6771-4515-a689-0c06cc35e3f7', // Audeze LCD-XC
  '5f5572c1-f47c-4782-9f77-df38b0847310', // Audiosense DT200
  '25ff4026-c864-4cc2-91c2-c2c516ae2e27', // Audiosense DT600
  '58719c89-611e-4dac-a2ef-c9cfcd4260c6', // Hifiman HE500
  '8a7e4b0b-2e5b-4cda-8fea-e8503404a339', // Meze Rai Penta
  '04f59f8d-23b1-441f-855d-97c7d61e42fd', // BLON B20
  'ef85dd6a-504a-4e7a-9039-e9062913b7d7', // Final D8000 Pro
  '3dc6d9cb-7ca3-47cf-9d20-51edeaab931b', // Moondrop Para
  '8f1e5613-98c8-4d31-9c06-6e7aff0094a4', // Moondrop Void
  '7dfd521f-f69d-44ae-a439-fe3ae735695f', // Stax SR-Lambda Pro
  'fd8daf38-e882-4ee4-a861-f82a2b6a463b', // Symphonium HarmonicDyne Helios
]

console.log('🔍 Fetching flagged components...\n')

const { data: components, error } = await supabase
  .from('components')
  .select('*')
  .in('id', FLAGGED_IDS)
  .order('category', { ascending: true })

if (error) {
  console.error('Error:', error)
  process.exit(1)
}

console.log(`Found ${components.length} components:\n`)

for (const comp of components) {
  console.log(`${comp.category.toUpperCase()}: ${comp.brand} ${comp.name}`)
  console.log(`  ID: ${comp.id}`)
  console.log(`  Driver: ${comp.driver_type || 'N/A'}`)
  console.log(`  Impedance: ${comp.impedance || 'N/A'}`)
  console.log(`  Needs Amp: ${comp.needs_amp || 'N/A'}`)
  console.log(`  Fit: ${comp.fit || 'N/A'}`)
  console.log()
}
