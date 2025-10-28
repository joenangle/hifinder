// Setup used_listings table via Supabase client
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupListingsTable() {
  console.log('🗃️ Setting up used_listings table...')
  
  try {
    // Since we can't run complex SQL via JS client, we'll provide the SQL to run manually
    const fs = require('fs')
    const path = require('path')
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'create-listings-table.sql'), 
      'utf8'
    )
    
    console.log('📋 Please run this SQL in Supabase Dashboard > SQL Editor:')
    console.log('=' * 60)
    console.log(sqlContent)
    console.log('=' * 60)
    
    // Try to check if table exists by querying it
    console.log('\n🔍 Checking if table exists...')
    const { data, error } = await supabase
      .from('used_listings')
      .select('count(*)')
      .limit(1)
    
    if (error) {
      console.log('❌ Table does not exist yet. Please run the SQL above first.')
      return false
    } else {
      console.log('✅ Table exists! Ready to add sample data.')
      return true
    }
    
  } catch (err) {
    console.error('❌ Setup failed:', err)
    return false
  }
}

if (require.main === module) {
  setupListingsTable()
}

module.exports = { setupListingsTable }