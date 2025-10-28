// Update budget tiers to match UI breakpoints
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// New tier system matching UI:
// budget: $20 - $100
// entry: $100 - $400
// mid: $400 - $1,000
// high: $1,000 - $3,000
// summit: $3,000+

async function updateBudgetTiers() {
  console.log('🔄 Updating budget tiers to match UI breakpoints...')
  
  try {
    // First, get all components with their prices
    const { data: components, error } = await supabase
      .from('components')
      .select('id, name, brand, price_used_min, price_used_max, budget_tier')
    
    if (error) {
      console.error('Error fetching components:', error)
      return
    }
    
    console.log(`Found ${components.length} components to update`)
    
    // Calculate new tiers based on average price
    const updates = components.map(comp => {
      const avgPrice = (comp.price_used_min + comp.price_used_max) / 2
      let newTier
      
      if (avgPrice < 100) {
        newTier = 'budget'
      } else if (avgPrice < 400) {
        newTier = 'entry'
      } else if (avgPrice < 1000) {
        newTier = 'mid'
      } else if (avgPrice < 3000) {
        newTier = 'high'
      } else {
        newTier = 'summit'
      }
      
      return {
        id: comp.id,
        name: comp.name,
        brand: comp.brand,
        oldTier: comp.budget_tier,
        newTier,
        avgPrice
      }
    })
    
    // Count changes
    const tierCounts = {
      budget: 0,
      entry: 0,
      mid: 0,
      high: 0,
      summit: 0
    }
    
    let changedCount = 0
    updates.forEach(u => {
      tierCounts[u.newTier]++
      if (u.oldTier !== u.newTier) changedCount++
    })
    
    console.log('\n📊 New tier distribution:')
    console.log(`  Budget ($20-100): ${tierCounts.budget} components`)
    console.log(`  Entry ($100-400): ${tierCounts.entry} components`)
    console.log(`  Mid ($400-1,000): ${tierCounts.mid} components`)
    console.log(`  High ($1,000-3,000): ${tierCounts.high} components`)
    console.log(`  Summit ($3,000+): ${tierCounts.summit} components`)
    console.log(`\n${changedCount} components will change tiers`)
    
    // Show some examples of changes
    console.log('\n🔍 Example changes:')
    const examples = updates
      .filter(u => u.oldTier !== u.newTier)
      .slice(0, 10)
    
    examples.forEach(ex => {
      console.log(`  ${ex.name} (${ex.brand}) - $${ex.avgPrice}: ${ex.oldTier} → ${ex.newTier}`)
    })
    
    // Update the database
    console.log('\n⏳ Updating database...')
    
    let successCount = 0
    let errorCount = 0
    
    for (const update of updates) {
      if (update.oldTier !== update.newTier) {
        const { error } = await supabase
          .from('components')
          .update({ budget_tier: update.newTier })
          .eq('id', update.id)
        
        if (error) {
          console.error(`Error updating ${update.name}:`, error.message)
          errorCount++
        } else {
          successCount++
        }
      }
    }
    
    console.log(`\n✅ Successfully updated ${successCount} components`)
    if (errorCount > 0) {
      console.log(`❌ Failed to update ${errorCount} components`)
    }
    
  } catch (err) {
    console.error('❌ Failed to update budget tiers:', err)
  }
}

async function main() {
  console.log('🚀 Starting budget tier update...')
  await updateBudgetTiers()
  console.log('\n✨ Budget tier update complete!')
}

if (require.main === module) {
  main()
}

module.exports = { updateBudgetTiers }