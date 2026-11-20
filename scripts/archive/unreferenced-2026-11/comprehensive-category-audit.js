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

// Known headphone model patterns (should be 'cans', not 'iems')
const HEADPHONE_PATTERNS = [
  // Audio-Technica
  /^ATH-M\d+/i,          // M-series (M20x, M30x, M40x, M50x, M60x, M70x)
  /^ATH-R\d+/i,          // R-series (R70x)
  /^ATH-AD\d+/i,         // AD-series (AD700X, AD900X, AD1000X, AD2000X)
  /^ATH-A\d+/i,          // A-series (A900X, A1000X, A2000X)
  /^ATH-W\d+/i,          // W-series (W1000X, W5000)

  // Sennheiser
  /^HD\s?\d+/i,          // HD series (HD25, HD280, HD600, HD650, HD800)
  /^Momentum/i,          // Momentum series
  /^HD25/i,              // HD25 variants

  // Sony
  /^MDR-[17]/i,          // MDR-1 and MDR-7 series (over-ear)
  /^MDR-Z/i,             // Z-series (MDR-Z1R, MDR-Z7)
  /^MDR-CD/i,            // CD-series
  /^MDR-AS/i,            // AS-series
  /^WH-/i,               // WH-series (WH-1000XM series)

  // AKG
  /^K[2-9]\d{2}/i,       // K-series 3-digit (K240, K371, K702, K712)
  /^K7\d{2}/i,           // K7xx series

  // Beyerdynamic
  /^DT\s?\d+/i,          // DT series (DT770, DT880, DT990, DT1770, DT1990)
  /^T\d+/i,              // T-series (T1, T5)

  // Grado
  /^SR\d+/i,             // SR series (SR60, SR80, SR325)
  /^PS\d+/i,             // PS series (PS500, PS1000)
  /^GS\d+/i,             // GS series (GS1000, GS2000)

  // HiFiMAN
  /^HE-?\d+/i,           // HE-series (HE400, HE560, HE1000)
  /^Sundara/i,
  /^Ananda/i,
  /^Arya/i,
  /^Edition/i,

  // Focal
  /^Clear/i,
  /^Elear/i,
  /^Utopia/i,
  /^Celestee/i,
  /^Radiance/i,

  // Meze
  /^99\s?(Classics|Neo)/i,
  /^Empyrean/i,
  /^Elite/i,

  // Drop/Massdrop
  /^Drop\s/i,
  /^Massdrop/i,

  // Audeze
  /^LCD-/i,              // LCD series
  /^LCDX/i,

  // ZMF
  /^Auteur/i,
  /^Aeolus/i,
  /^Verite/i,
]

// Known IEM model patterns (should be 'iems', not 'cans')
const IEM_PATTERNS = [
  // Common IEM naming
  /\b(Pro|TWS|Earbuds?)\b/i,

  // Sony IEM series
  /^MDR-EX/i,            // EX-series are IEMs

  // Shure
  /^SE\d+/i,             // SE215, SE425, SE535, SE846

  // Etymotic
  /^ER\d+/i,             // ER2, ER3, ER4

  // Westone
  /^UM\s?Pro/i,
  /^W\d+/i,

  // Audio-Technica IEMs (different from headphones)
  /^ATH-LS/i,            // LS-series are IEMs
  /^ATH-E\d+/i,          // E-series (E40, E50, E70)

  // Common single-letter + number IEMs
  /^[A-Z]\d+$/,          // Like "B2", "S8", etc.

  // Apple
  /AirPods/i,
  /EarPods/i,
]

// Brands that ONLY make IEMs (if from these brands, should be 'iems')
const IEM_ONLY_BRANDS = [
  'Truthear',
  'Moondrop',
  'LETSHUOER',
  'Kiwi Ears',
  'BQEYZ',
  'ZIIGAAT',
  'Symphonium',
  'ThieAudio',
  'Kinera',
  'FiiO', // Primarily IEMs, some DAPs
  'DUNU',
  'Campfire Audio',
  'Noble Audio',
  'Unique Melody',
  '64 Audio',
  'Empire Ears',
  'qdc',
]

// Brands that ONLY make headphones (if from these brands, should be 'cans')
const HEADPHONE_ONLY_BRANDS = [
  'Grado',
  'ZMF',
  'Audeze',
  'HiFiMAN',
  'Meze',
  'Focal',
]

console.log('🔍 COMPREHENSIVE CATEGORY AUDIT\n')
console.log('Fetching all components from database...\n')

// Fetch ALL components
const { data: allComponents, error } = await supabase
  .from('components')
  .select('id, brand, name, category, driver_type')
  .in('category', ['cans', 'iems'])
  .order('brand', { ascending: true })
  .order('name', { ascending: true })

if (error) {
  console.error('Error fetching components:', error)
  process.exit(1)
}

console.log(`📊 Total components: ${allComponents.length}\n`)

const issues = {
  cansActuallyIems: [],
  iemsActuallyCans: [],
}

// Check each component
for (const component of allComponents) {
  const { id, brand, name, category, driver_type } = component

  // Skip if no name
  if (!name) continue

  // Check brand-based rules first
  if (IEM_ONLY_BRANDS.includes(brand) && category === 'cans') {
    issues.cansActuallyIems.push({ id, brand, name, reason: 'IEM-only brand' })
    continue
  }

  if (HEADPHONE_ONLY_BRANDS.includes(brand) && category === 'iems') {
    issues.iemsActuallyCans.push({ id, brand, name, reason: 'Headphone-only brand' })
    continue
  }

  // Check driver type (BA/hybrid are IEM-only)
  if (driver_type === 'BA' && category === 'cans') {
    issues.cansActuallyIems.push({ id, brand, name, reason: 'BA driver (IEM-only)' })
    continue
  }

  // Check pattern matching
  if (category === 'iems') {
    // Check if it matches headphone patterns
    for (const pattern of HEADPHONE_PATTERNS) {
      if (pattern.test(name)) {
        issues.iemsActuallyCans.push({ id, brand, name, reason: `Matches pattern: ${pattern}` })
        break
      }
    }
  } else if (category === 'cans') {
    // Check if it matches IEM patterns
    for (const pattern of IEM_PATTERNS) {
      if (pattern.test(name)) {
        // But exclude patterns that could be headphones too
        if (!HEADPHONE_PATTERNS.some(hp => hp.test(name))) {
          issues.cansActuallyIems.push({ id, brand, name, reason: `Matches pattern: ${pattern}` })
          break
        }
      }
    }
  }
}

// Report findings
console.log('\n' + '='.repeat(80))
console.log('📋 AUDIT RESULTS')
console.log('='.repeat(80) + '\n')

if (issues.iemsActuallyCans.length > 0) {
  console.log(`\n❌ CATEGORY: IEMs → Should be CANS (${issues.iemsActuallyCans.length} items)\n`)
  issues.iemsActuallyCans.forEach(({ id, brand, name, reason }) => {
    console.log(`  • ${brand} ${name}`)
    console.log(`    Reason: ${reason}`)
    console.log(`    ID: ${id}\n`)
  })
}

if (issues.cansActuallyIems.length > 0) {
  console.log(`\n❌ CATEGORY: CANS → Should be IEMs (${issues.cansActuallyIems.length} items)\n`)
  issues.cansActuallyIems.forEach(({ id, brand, name, reason }) => {
    console.log(`  • ${brand} ${name}`)
    console.log(`    Reason: ${reason}`)
    console.log(`    ID: ${id}\n`)
  })
}

const totalIssues = issues.iemsActuallyCans.length + issues.cansActuallyIems.length

if (totalIssues === 0) {
  console.log('✅ No categorization issues found!\n')
} else {
  console.log(`\n⚠️  Total issues found: ${totalIssues}`)
  console.log(`   - ${issues.iemsActuallyCans.length} IEMs miscategorized as cans`)
  console.log(`   - ${issues.cansActuallyIems.length} cans miscategorized as IEMs\n`)

  // Generate fix IDs
  console.log('\n' + '='.repeat(80))
  console.log('📝 IDs TO FIX')
  console.log('='.repeat(80) + '\n')

  if (issues.iemsActuallyCans.length > 0) {
    console.log('IEMs → CANS:')
    console.log(JSON.stringify(issues.iemsActuallyCans.map(i => i.id), null, 2))
  }

  if (issues.cansActuallyIems.length > 0) {
    console.log('\nCANS → IEMs:')
    console.log(JSON.stringify(issues.cansActuallyIems.map(i => i.id), null, 2))
  }
}

console.log('\n✅ Audit complete!')
