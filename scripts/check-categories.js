// Check existing category values
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCategories() {
  console.log('Checking existing category values...')
  
  try {
    const { data, error } = await supabase
      .from('components')
      .select('category')
      .not('category', 'is', null)
    
    if (error) {
      console.error('Error:', error)
    } else {
      const uniqueCategories = [...new Set(data.map(item => item.category))]
      console.log('Existing category values:', uniqueCategories)
    }
  } catch (err) {
    console.error('Failed:', err)
  }
}

checkCategories()