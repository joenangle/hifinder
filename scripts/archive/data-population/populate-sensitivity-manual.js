// Manual sensitivity data population bypassing database triggers
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Real sensitivity data from manufacturer specifications
const sensitivityData = [
  // Sennheiser
  { brand: 'Sennheiser', name: 'HD 600', sensitivity: 97 },
  { brand: 'Sennheiser', name: 'HD 650', sensitivity: 103 },
  
  // Beyerdynamic
  { brand: 'Beyerdynamic', name: 'DT 770 Pro', sensitivity: 96 },
  { brand: 'Beyerdynamic', name: 'DT 990 Pro', sensitivity: 96 },
  { brand: 'Beyerdynamic', name: 'DT 1990 Pro', sensitivity: 102 },
  
  // Audio-Technica
  { brand: 'Audio-Technica', name: 'ATH-M50x', sensitivity: 99 },
  { brand: 'Audio-Technica', name: 'ATH-R70x', sensitivity: 98 },
  { brand: 'Audio-Technica', name: 'ATH-AD700X', sensitivity: 100 },
  
  // HiFiMAN
  { brand: 'HiFiMAN', name: 'Sundara', sensitivity: 94 },
  { brand: 'HiFiMAN', name: 'Edition XS', sensitivity: 92 },
  { brand: 'HiFiMAN', name: 'Ananda', sensitivity: 103 },
  { brand: 'HiFiMAN', name: 'Arya', sensitivity: 94 },
  { brand: 'HiFiMAN', name: 'HE400se', sensitivity: 91 },
  
  // AKG
  { brand: 'AKG', name: 'K702', sensitivity: 105 },
  { brand: 'AKG', name: 'K712 Pro', sensitivity: 105 },
  
  // Sony
  { brand: 'Sony', name: 'MDR-7506', sensitivity: 106 },
  
  // Focal
  { brand: 'Focal', name: 'Clear', sensitivity: 104 },
  { brand: 'Focal', name: 'Utopia', sensitivity: 104 },
  { brand: 'Focal', name: 'Stellia', sensitivity: 106 },
  
  // Audeze
  { brand: 'Audeze', name: 'LCD-2', sensitivity: 101 },
  { brand: 'Audeze', name: 'LCD-X', sensitivity: 103 },
  
  // Grado
  { brand: 'Grado', name: 'SR325x', sensitivity: 99.8 },
  
  // Moondrop IEMs
  { brand: 'Moondrop', name: 'Variations', sensitivity: 126 },
  { brand: 'Moondrop', name: 'Blessing 2', sensitivity: 117 },
  { brand: 'Moondrop', name: 'Aria', sensitivity: 122 },
];

function calculatePowerRequirements(impedance, sensitivity_dB_mW, targetSPL = 110) {
  const powerNeeded_mW = Math.pow(10, (targetSPL - sensitivity_dB_mW) / 10);
  const voltageNeeded_V = Math.sqrt((powerNeeded_mW / 1000) * impedance);
  
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
  
  return {
    powerNeeded_mW: Math.round(powerNeeded_mW * 10) / 10,
    voltageNeeded_V: Math.round(voltageNeeded_V * 100) / 100,
    difficulty,
    needsAmp: difficulty !== 'easy'
  };
}

async function populateSensitivityManual() {
  console.log('🎧 Manual sensitivity data population (bypassing triggers)...\n');
  
  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  
  for (const item of sensitivityData) {
    try {
      console.log(`🔍 Looking for: ${item.brand} ${item.name}`);
      
      // Find the component
      const { data: components, error: findError } = await supabase
        .from('components')
        .select('id, name, brand, impedance')
        .ilike('brand', item.brand)
        .ilike('name', `%${item.name}%`)
        .in('category', ['cans', 'iems']);
      
      if (findError) {
        console.error(`❌ Error searching for ${item.brand} ${item.name}:`, findError);
        errorCount++;
        continue;
      }
      
      if (!components || components.length === 0) {
        console.log(`⚠️  Not found: ${item.brand} ${item.name}`);
        notFoundCount++;
        continue;
      }
      
      const component = components.find(c => 
        c.name.toLowerCase().includes(item.name.toLowerCase())
      ) || components[0];
      
      console.log(`✅ Found: ${component.brand} ${component.name} (ID: ${component.id})`);
      
      if (!component.impedance) {
        console.log(`⚠️  No impedance data for ${component.name}, skipping power calc`);
        continue;
      }
      
      // Calculate power requirements
      const powerCalc = calculatePowerRequirements(component.impedance, item.sensitivity);
      
      console.log(`📊 Sensitivity: ${item.sensitivity} dB/mW, Impedance: ${component.impedance}Ω`);
      console.log(`⚡ Power: ${powerCalc.powerNeeded_mW}mW, Voltage: ${powerCalc.voltageNeeded_V}V`);
      console.log(`🎯 Difficulty: ${powerCalc.difficulty.toUpperCase()}`);
      
      // Insert specification data
      const { error: specError } = await supabase
        .from('component_specifications')
        .upsert({
          component_id: component.id,
          sensitivity_db_mw: item.sensitivity,
          measurement_condition: '1kHz'
        }, {
          onConflict: 'component_id'
        });
        
      if (specError) {
        console.error(`❌ Error adding spec for ${component.name}:`, specError);
        errorCount++;
        continue;
      }
      
      // Update component with power calculations
      const { error: updateError } = await supabase
        .from('components')
        .update({
          power_required_mw: powerCalc.powerNeeded_mW,
          voltage_required_v: powerCalc.voltageNeeded_V,
          amplification_difficulty: powerCalc.difficulty,
          needs_amp: powerCalc.needsAmp
        })
        .eq('id', component.id);
        
      if (updateError) {
        console.error(`❌ Error updating ${component.name}:`, updateError);
        errorCount++;
        continue;
      }
      
      console.log(`✅ Successfully updated ${component.name}`);
      successCount++;
      console.log(''); // Empty line for readability
      
    } catch (err) {
      console.error(`💥 Exception processing ${item.brand} ${item.name}:`, err);
      errorCount++;
    }
  }
  
  // Summary
  console.log('📋 Manual Population Summary:');
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`⚠️  Not found in database: ${notFoundCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total attempted: ${sensitivityData.length}`);
  
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
  
  // Check component_specifications table
  const { data: specResults, error: specResultsError } = await supabase
    .from('component_specifications')
    .select('*')
    .limit(5);
    
  if (specResults && !specResultsError) {
    console.log(`\n📊 Component specifications table now has ${specResults.length > 0 ? 'data' : 'no data'}`);
    if (specResults.length > 0) {
      console.log('Sample specs:', specResults.slice(0, 3).map(s => 
        `${s.component_id}: ${s.sensitivity_db_mw}dB/mW`
      ));
    }
  }
  
  console.log('\n🎉 Manual sensitivity data population complete!');
}

if (require.main === module) {
  populateSensitivityManual();
}

module.exports = { populateSensitivityManual };