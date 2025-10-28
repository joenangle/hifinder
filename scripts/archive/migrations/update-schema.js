// Schema update script for HiFinder component categories
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateSchema() {
  console.log('🔄 Updating database schema...')
  
  try {
    // First, update any existing 'headphones' entries to 'cans'
    console.log('📝 Converting existing headphones to cans...')
    const { data: updateResult, error: updateError } = await supabase
      .from('components')
      .update({ category: 'cans' })
      .eq('category', 'headphones')
      .select()
    
    if (updateError) {
      console.error('Update error:', updateError)
    } else {
      console.log(`✅ Updated ${updateResult?.length || 0} headphones entries to cans`)
    }
    
    // Try to drop and recreate the constraint using raw SQL
    console.log('🗃️ Updating category constraints...')
    
    // Note: This might fail if we don't have sufficient permissions
    // In that case, user needs to run the SQL manually in Supabase dashboard
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE components 
        DROP CONSTRAINT IF EXISTS components_category_check;
        
        ALTER TABLE components 
        ADD CONSTRAINT components_category_check 
        CHECK (category IN ('cans', 'iems', 'dac', 'amp', 'dac_amp', 'cable'));
      `
    })
    
    if (sqlError) {
      console.log('⚠️ Could not update constraints automatically:', sqlError.message)
      console.log('📋 Please run this SQL manually in Supabase Dashboard > SQL Editor:')
      console.log(`
ALTER TABLE components 
DROP CONSTRAINT IF EXISTS components_category_check;

ALTER TABLE components 
ADD CONSTRAINT components_category_check 
CHECK (category IN ('cans', 'iems', 'dac', 'amp', 'dac_amp', 'cable'));
      `)
    } else {
      console.log('✅ Schema constraints updated successfully!')
    }
    
    // Check current state
    const { data: summary } = await supabase
      .from('components')
      .select('category')
    
    const categoryCounts = summary?.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1
      return acc
    }, {})
    
    console.log('📊 Current database state:', categoryCounts)
    
  } catch (err) {
    console.error('❌ Schema update failed:', err)
  }
}

if (require.main === module) {
  updateSchema()
}

module.exports = { updateSchema }