// Trigger power calculations for components that have sensitivity data
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function triggerPowerCalculations() {
  console.log('⚡ Triggering power calculations for components with sensitivity data...\n');
  
  try {
    // Find components that have sensitivity data but no power calculations yet
    const { data: componentsWithSpecs, error: queryError } = await supabase
      .from('components')
      .select(`
        id, name, brand, impedance, power_required_mw,
        component_specifications(sensitivity_db_mw)
      `)
      .not('component_specifications.sensitivity_db_mw', 'is', null);
      
    if (queryError) {
      console.error('❌ Error querying components:', queryError);
      return;
    }
    
    if (!componentsWithSpecs || componentsWithSpecs.length === 0) {
      console.log('⚠️  No components found with sensitivity data');
      return;
    }
    
    console.log(`📊 Found ${componentsWithSpecs.length} components with sensitivity data`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const component of componentsWithSpecs) {
      try {
        console.log(`🔄 Processing: ${component.brand} ${component.name}`);
        
        const specs = component.component_specifications?.[0];
        if (!specs || !specs.sensitivity_db_mw) {
          console.log(`⚠️  No sensitivity data found for ${component.name}`);
          continue;
        }
        
        console.log(`📊 Sensitivity: ${specs.sensitivity_db_mw} dB/mW, Impedance: ${component.impedance}Ω`);
        
        // Calculate power requirements manually since triggers might not be working
        if (component.impedance && specs.sensitivity_db_mw) {
          const targetSPL = 110;
          const powerNeeded_mW = Math.pow(10, (targetSPL - specs.sensitivity_db_mw) / 10);
          const voltageNeeded_V = Math.sqrt((powerNeeded_mW / 1000) * component.impedance);
          
          let difficulty;
          if (powerNeeded_mW <= 10 && voltageNeeded_V <= 1.0) {
            difficulty = 'easy';
          } else if (powerNeeded_mW <= 50 && voltageNeeded_V <= 2.5) {
            difficulty = 'moderate';
          } else if (powerNeeded_mW <= 200 && voltageNeeded_V <= 5.0) {
            difficulty = 'demanding';
          } else {
            difficulty = 'very_demanding';
          }
          
          // Update component with calculated values
          const { error: updateError } = await supabase
            .from('components')
            .update({
              power_required_mw: Math.round(powerNeeded_mW * 10) / 10,
              voltage_required_v: Math.round(voltageNeeded_V * 100) / 100,
              amplification_difficulty: difficulty,
              needs_amp: difficulty !== 'easy'
            })
            .eq('id', component.id);
            
          if (updateError) {
            console.error(`❌ Error updating ${component.name}:`, updateError);
            errorCount++;
          } else {
            console.log(`✅ Updated: ${powerNeeded_mW.toFixed(1)}mW, ${voltageNeeded_V.toFixed(2)}V, ${difficulty}`);
            successCount++;
          }
        } else {
          console.log(`⚠️  Missing impedance or sensitivity for ${component.name}`);
        }
        
        console.log(''); // Empty line for readability
        
      } catch (err) {
        console.error(`💥 Exception processing ${component.name}:`, err);
        errorCount++;
      }
    }
    
    // Summary
    console.log('📋 Calculation Summary:');
    console.log(`✅ Successfully calculated: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total processed: ${componentsWithSpecs.length}`);
    
    // Show results
    console.log('\n🔍 Checking results...');
    const { data: results, error: resultsError } = await supabase
      .from('components')
      .select('name, brand, impedance, power_required_mw, voltage_required_v, amplification_difficulty')
      .not('power_required_mw', 'is', null)
      .order('power_required_mw', { ascending: false })
      .limit(10);
      
    if (results && !resultsError) {
      console.log('\n🎯 Top 10 Most Demanding Headphones:');
      results.forEach((r, i) => {
        console.log(`${i+1}. ${r.brand} ${r.name}: ${r.power_required_mw}mW, ${r.voltage_required_v}V (${r.amplification_difficulty})`);
      });
    }
    
    console.log('\n🎉 Power calculations complete!');
    
  } catch (err) {
    console.error('💥 Fatal error:', err);
  }
}

if (require.main === module) {
  triggerPowerCalculations();
}

module.exports = { triggerPowerCalculations };