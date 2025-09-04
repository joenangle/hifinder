// Populate sensitivity data for existing headphones
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Real sensitivity data from manufacturer specifications and measurements
const sensitivityData = [
  // Sennheiser
  { brand: 'Sennheiser', name: 'HD 600', sensitivity: 97, condition: '1kHz' },
  { brand: 'Sennheiser', name: 'HD 650', sensitivity: 103, condition: '1kHz' },
  { brand: 'Sennheiser', name: 'HD 660S', sensitivity: 104, condition: '1kHz' },
  { brand: 'Sennheiser', name: 'HD 800', sensitivity: 102, condition: '1kHz' },
  { brand: 'Sennheiser', name: 'HD 800S', sensitivity: 102, condition: '1kHz' },
  
  // Beyerdynamic
  { brand: 'Beyerdynamic', name: 'DT 770 Pro', sensitivity: 96, condition: '1kHz' },
  { brand: 'Beyerdynamic', name: 'DT 880 Pro', sensitivity: 96, condition: '1kHz' },
  { brand: 'Beyerdynamic', name: 'DT 990 Pro', sensitivity: 96, condition: '1kHz' },
  { brand: 'Beyerdynamic', name: 'DT 1990 Pro', sensitivity: 102, condition: '1kHz' },
  
  // Audio-Technica
  { brand: 'Audio-Technica', name: 'ATH-M50x', sensitivity: 99, condition: '1kHz' },
  { brand: 'Audio-Technica', name: 'ATH-R70x', sensitivity: 98, condition: '1kHz' },
  { brand: 'Audio-Technica', name: 'ATH-AD700X', sensitivity: 100, condition: '1kHz' },
  
  // HiFiMAN
  { brand: 'HiFiMAN', name: 'Sundara', sensitivity: 94, condition: '1kHz' },
  { brand: 'HiFiMAN', name: 'Edition XS', sensitivity: 92, condition: '1kHz' },
  { brand: 'HiFiMAN', name: 'Ananda', sensitivity: 103, condition: '1kHz' },
  { brand: 'HiFiMAN', name: 'Arya', sensitivity: 94, condition: '1kHz' },
  { brand: 'HiFiMAN', name: 'HE400se', sensitivity: 91, condition: '1kHz' },
  { brand: 'HiFiMAN', name: 'HE-6', sensitivity: 83.5, condition: '1kHz' }, // Notoriously hard to drive
  
  // AKG
  { brand: 'AKG', name: 'K371', sensitivity: 114, condition: '1kHz' }, // Very efficient
  { brand: 'AKG', name: 'K702', sensitivity: 105, condition: '1kHz' },
  { brand: 'AKG', name: 'K712 Pro', sensitivity: 105, condition: '1kHz' },
  
  // Sony
  { brand: 'Sony', name: 'WH-1000XM4', sensitivity: 105, condition: '1kHz' },
  { brand: 'Sony', name: 'WH-1000XM5', sensitivity: 108, condition: '1kHz' },
  { brand: 'Sony', name: 'MDR-7506', sensitivity: 106, condition: '1kHz' },
  
  // Focal
  { brand: 'Focal', name: 'Clear', sensitivity: 104, condition: '1kHz' },
  { brand: 'Focal', name: 'Utopia', sensitivity: 104, condition: '1kHz' },
  { brand: 'Focal', name: 'Stellia', sensitivity: 106, condition: '1kHz' },
  
  // Audeze
  { brand: 'Audeze', name: 'LCD-2', sensitivity: 101, condition: '1kHz' },
  { brand: 'Audeze', name: 'LCD-X', sensitivity: 103, condition: '1kHz' },
  { brand: 'Audeze', name: 'LCD-5', sensitivity: 90, condition: '1kHz' }, // Planar magnetic, lower sensitivity
  
  // Grado
  { brand: 'Grado', name: 'SR325x', sensitivity: 99.8, condition: '1kHz' },
  { brand: 'Grado', name: 'SR80x', sensitivity: 99.8, condition: '1kHz' },
  
  // IEMs - Generally more efficient
  { brand: 'Shure', name: 'SE215', sensitivity: 107, condition: '1kHz' },
  { brand: 'Shure', name: 'SE425', sensitivity: 107, condition: '1kHz' },
  { brand: 'Shure', name: 'SE535', sensitivity: 119, condition: '1kHz' }, // Very efficient IEM
  
  { brand: 'Etymotic', name: 'ER2XR', sensitivity: 96, condition: '1kHz' },
  { brand: 'Etymotic', name: 'ER4XR', sensitivity: 98, condition: '1kHz' },
  
  { brand: 'Campfire Audio', name: 'Andromeda', sensitivity: 112.8, condition: '1kHz' },
  { brand: 'Campfire Audio', name: 'Ara', sensitivity: 94, condition: '1kHz' },
  
  { brand: 'Moondrop', name: 'Variations', sensitivity: 126, condition: '1kHz' }, // Very efficient
  { brand: 'Moondrop', name: 'Blessing 2', sensitivity: 117, condition: '1kHz' },
  { brand: 'Moondrop', name: 'Aria', sensitivity: 122, condition: '1kHz' },
  
  { brand: 'Fiio', name: 'FH3', sensitivity: 111, condition: '1kHz' },
  { brand: 'Fiio', name: 'FD5', sensitivity: 111, condition: '1kHz' },
  
  // KZ (budget IEMs)
  { brand: 'KZ', name: 'ZSN Pro', sensitivity: 109, condition: '1kHz' },
  { brand: 'KZ', name: 'AS10', sensitivity: 105, condition: '1kHz' }
];

async function populateSensitivityData() {
  console.log('🎧 Populating sensitivity data for existing headphones...\n');
  
  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  
  for (const item of sensitivityData) {
    try {
      console.log(`🔍 Looking for: ${item.brand} ${item.name}`);
      
      // Find the component in the database
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
      
      // If multiple matches, pick the best one
      const component = components.find(c => 
        c.name.toLowerCase().includes(item.name.toLowerCase())
      ) || components[0];
      
      console.log(`✅ Found: ${component.brand} ${component.name} (ID: ${component.id})`);
      
      // Insert or update specification
      const { error: specError } = await supabase
        .from('component_specifications')
        .upsert({
          component_id: component.id,
          sensitivity_db_mw: item.sensitivity,
          measurement_condition: item.condition
        }, {
          onConflict: 'component_id'
        });
        
      if (specError) {
        console.error(`❌ Error adding spec for ${component.name}:`, specError);
        errorCount++;
        continue;
      }
      
      console.log(`📊 Added sensitivity: ${item.sensitivity} dB/mW @ ${item.condition}`);
      
      // Trigger power calculation by updating the component (the trigger will calculate power)
      const { error: updateError } = await supabase
        .from('components')
        .update({ 
          // Touch the created_at field to trigger update (only change if necessary)
          created_at: component.created_at
        })
        .eq('id', component.id);
        
      if (updateError) {
        console.error(`❌ Error triggering calculation for ${component.name}:`, updateError);
        errorCount++;
      } else {
        console.log(`⚡ Power calculations triggered`);
        successCount++;
      }
      
      console.log(''); // Empty line for readability
      
    } catch (err) {
      console.error(`💥 Exception processing ${item.brand} ${item.name}:`, err);
      errorCount++;
    }
  }
  
  // Summary
  console.log('📋 Migration Summary:');
  console.log(`✅ Successfully processed: ${successCount}`);
  console.log(`⚠️  Not found in database: ${notFoundCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total attempted: ${sensitivityData.length}`);
  
  // Show some results
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
  
  console.log('\n🎉 Sensitivity data population complete!');
  console.log('\nThe database triggers will automatically:');
  console.log('- Calculate power requirements when sensitivity data is available');
  console.log('- Update amplification difficulty ratings');
  console.log('- Maintain needs_amp flags');
}

if (require.main === module) {
  populateSensitivityData();
}

module.exports = { populateSensitivityData };