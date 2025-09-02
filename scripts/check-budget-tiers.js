// Check existing budget tier values
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkBudgetTiers() {
  console.log('Checking existing budget tier values...')
  
  try {
    const { data, error } = await supabase
      .from('components')
      .select('budget_tier')
      .not('budget_tier', 'is', null)
    
    if (error) {
      console.error('Error:', error)
    } else {
      const uniqueTiers = [...new Set(data.map(item => item.budget_tier))]
      console.log('Existing budget_tier values:', uniqueTiers)
    }
  } catch (err) {
    console.error('Failed:', err)
  }
}

checkBudgetTiers()