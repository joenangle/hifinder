// Update budget tiers by temporarily working with existing values
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateBudgetTiersWorkaround() {
  console.log('🔄 Updating budget tiers with workaround approach...')
  
  try {
    // Get all components with their prices
    const { data: components, error } = await supabase
      .from('components')
      .select('id, name, brand, price_used_min, price_used_max, budget_tier')
    
    if (error) {
      console.error('Error fetching components:', error)
      return
    }
    
    console.log(`Found ${components.length} components to update`)
    
    // Analyze what changes we need to make with existing constraint
    const updates = components.map(comp => {
      const avgPrice = (comp.price_used_min + comp.price_used_max) / 2
      let newTier
      
      // Map to existing values only for now
      if (avgPrice < 200) {
        newTier = 'entry'  // This will represent budget tier
      } else if (avgPrice < 600) {
        newTier = 'entry'  // True entry tier  
      } else if (avgPrice < 1500) {
        newTier = 'mid'    // Mid tier
      } else {
        newTier = 'high'   // This will represent both high and summit
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
    
    // Count changes within existing constraint
    const tierCounts = {
      entry: 0,
      mid: 0,
      high: 0
    }
    
    let changedCount = 0
    updates.forEach(u => {
      tierCounts[u.newTier]++
      if (u.oldTier !== u.newTier) changedCount++
    })
    
    console.log('\n📊 Updated tier distribution (using existing constraint):')
    console.log(`  Entry ($20-600): ${tierCounts.entry} components`)
    console.log(`  Mid ($600-1,500): ${tierCounts.mid} components`)
    console.log(`  High ($1,500+): ${tierCounts.high} components`)
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
    
    console.log('\n📝 Note: Database constraint still limits to 3 tiers (entry/mid/high).')
    console.log('To fully implement 5-tier system, constraint needs manual update in Supabase dashboard.')
    
  } catch (err) {
    console.error('❌ Failed to update budget tiers:', err)
  }
}

async function main() {
  console.log('🚀 Starting budget tier update workaround...')
  await updateBudgetTiersWorkaround()
  console.log('\n✨ Budget tier update workaround complete!')
}

if (require.main === module) {
  main()
}

module.exports = { updateBudgetTiersWorkaround }