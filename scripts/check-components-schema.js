const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkComponentsSchema() {
  console.log('🔍 Checking components table schema...');
  
  try {
    // Try to get a sample component to see the actual column structure
    const { data, error } = await supabase
      .from('components')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error querying components:', error.message);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Components table found!');
      console.log('Available columns:');
      Object.keys(data[0]).forEach(column => {
        console.log(`  - ${column}: ${typeof data[0][column]} (${data[0][column]})`);
      });
      
      console.log('\nSample component:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️  Components table is empty');
    }
    
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
}

checkComponentsSchema();