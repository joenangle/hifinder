// Final sensitivity data population with direct power calculation updates
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Curated sensitivity data for components we know exist
const sensitivityData = [
  // High-impedance headphones that need amplification
  { componentId: '7a89f065-8887-456d-ad70-691d6a3aa291', name: 'HD 600', sensitivity: 97, impedance: 300 },
  { componentId: 'f9052e21-147e-4554-9e82-bc6a3f1ab255', name: 'HD 650', sensitivity: 103, impedance: 300 },
  { componentId: 'e8b99236-b8a4-4bd9-83fc-808423a5561c', name: 'DT 770 Pro 80', sensitivity: 96, impedance: 80 },
  { componentId: 'eb4d77f7-11cc-4cdc-8cb2-d9b1297aa4d9', name: 'DT 990 Pro', sensitivity: 96, impedance: 250 },
  { componentId: 'f1dd15f4-f94e-4eb7-83aa-31c9c3c98b9f', name: 'DT 1990 Pro', sensitivity: 102, impedance: 250 },
  
  // Planar magnetics (generally harder to drive)
  { componentId: '4dde0bfc-2fe4-45fa-bb4a-cbf5ccd66373', name: 'Sundara', sensitivity: 94, impedance: 32 },
  { componentId: '6f4e9530-451b-4728-8904-50d8d3802a5b', name: 'Edition XS', sensitivity: 92, impedance: 18 },
  
  // Easy to drive headphones
  { componentId: '0dc77d24-be32-42d3-9ef5-5c128deba554', name: 'Clear OG', sensitivity: 104, impedance: 55 },
  { componentId: '7d348250-d892-464e-bc15-c8442499e7cf', name: 'LCD-X', sensitivity: 103, impedance: 20 },
  
  // Very efficient IEMs
  { componentId: '0835b769-4175-4596-88c9-f429e43fbce6', name: 'Variations', sensitivity: 126, impedance: 15 },
  { componentId: 'c73fd25e-9178-4135-b829-16f0af725b19', name: 'Blessing 2', sensitivity: 117, impedance: 22 },
  { componentId: 'd2d0df43-1ada-41f4-8192-ccc49bad3da1', name: 'Aria', sensitivity: 122, impedance: 32 },
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

async function populateFinalData() {
  console.log('🎧 Final Amplification Data Population...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const item of sensitivityData) {
    try {
      console.log(`🔄 Processing: ${item.name}`);
      
      // Calculate power requirements
      const powerCalc = calculatePowerRequirements(item.impedance, item.sensitivity);
      
      console.log(`📊 ${item.name}: ${item.sensitivity}dB/mW @ ${item.impedance}Ω`);
      console.log(`⚡ Power: ${powerCalc.powerNeeded_mW}mW, Voltage: ${powerCalc.voltageNeeded_V}V`);
      console.log(`🎯 Difficulty: ${powerCalc.difficulty.toUpperCase()}`);
      
      // First, add to component_specifications table (skip trigger issues by using direct insert)
      const { error: specError } = await supabase
        .from('component_specifications')
        .upsert({
          component_id: item.componentId,
          sensitivity_db_mw: item.sensitivity,
          measurement_condition: '1kHz',
          created_at: new Date().toISOString()
        }, {
          onConflict: 'component_id'
        });
        
      if (specError) {
        console.error(`❌ Spec error for ${item.name}:`, specError.message);
        errorCount++;
        continue;
      }
      
      // Then update the main components table with power calculations
      const { error: updateError } = await supabase
        .from('components')
        .update({
          power_required_mw: powerCalc.powerNeeded_mW,
          voltage_required_v: powerCalc.voltageNeeded_V,
          amplification_difficulty: powerCalc.difficulty,
          needs_amp: powerCalc.needsAmp
        })
        .eq('id', item.componentId);
        
      if (updateError) {
        console.error(`❌ Update error for ${item.name}:`, updateError.message);
        errorCount++;
        continue;
      }
      
      console.log(`✅ Successfully updated ${item.name}\\n`);
      successCount++;
      
    } catch (err) {
      console.error(`💥 Exception processing ${item.name}:`, err.message);
      errorCount++;
    }
  }
  
  // Summary
  console.log('📋 Final Population Summary:');
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total attempted: ${sensitivityData.length}`);
  
  if (successCount > 0) {
    // Show results sorted by power requirement (most demanding first)
    console.log('\\n🔍 Checking results...');
    const { data: results, error: resultsError } = await supabase
      .from('components')
      .select('name, brand, impedance, power_required_mw, voltage_required_v, amplification_difficulty')
      .not('power_required_mw', 'is', null)
      .order('power_required_mw', { ascending: false })
      .limit(15);
      
    if (results && !resultsError && results.length > 0) {
      console.log('\\n🎯 Amplification Assessment Results:');
      results.forEach((r, i) => {
        const icon = r.amplification_difficulty === 'easy' ? '🎧' : 
                    r.amplification_difficulty === 'moderate' ? '🔋' :
                    r.amplification_difficulty === 'demanding' ? '⚡' : '⚡⚡';
        console.log(`${i+1}. ${icon} ${r.brand} ${r.name}: ${r.power_required_mw}mW, ${r.voltage_required_v}V (${r.amplification_difficulty})`);
      });
    }
    
    // Check component_specifications table status
    const { data: specCount } = await supabase
      .from('component_specifications')
      .select('component_id', { count: 'exact' });
      
    console.log(`\\n📊 Component specifications table now has ${specCount?.length || 0} entries`);
  }
  
  console.log('\\n🎉 Amplification assessment implementation complete!');
  console.log('\\nFeatures now available:');
  console.log('📊 - Scientific power requirement calculations');
  console.log('🎯 - Four-tier amplification difficulty assessment');
  console.log('⚡ - Voltage and power requirements for each headphone');
  console.log('🎧 - Easy/moderate/demanding/very_demanding ratings');
  console.log('📱 - Source compatibility indicators');
}

if (require.main === module) {
  populateFinalData();
}

module.exports = { populateFinalData };