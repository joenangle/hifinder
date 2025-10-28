const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQLThroughSupabase() {
  try {
    console.log('=== Attempting to execute SQL through Supabase client ===');
    
    // Method 1: Try using the REST API with raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        sql: 'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'components\' ORDER BY ordinal_position;'
      })
    });
    
    console.log('Raw SQL attempt - Status:', response.status);
    const result = await response.text();
    console.log('Response:', result);
    
  } catch (err) {
    console.log('Method 1 failed:', err.message);
  }
  
  try {
    console.log('\n=== Checking current table schema ===');
    
    // Method 2: Try to get table info through information_schema
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'components')
      .order('ordinal_position');
      
    if (error) {
      console.log('Schema check error:', error);
    } else {
      console.log('Components table columns:', columns);
    }
    
  } catch (err) {
    console.log('Method 2 failed:', err.message);
  }
  
  try {
    console.log('\n=== Alternative: Manual column addition via API ===');
    
    // Method 3: Try to update a record with image_url to see the exact error
    const { data, error } = await supabase
      .from('components')
      .select('id, name')
      .limit(1);
    
    if (data && data[0]) {
      const testRecord = data[0];
      console.log('Testing with record:', testRecord.name);
      
      const { data: updateData, error: updateError } = await supabase
        .from('components')
        .update({ image_url: 'test' })
        .eq('id', testRecord.id)
        .select();
        
      if (updateError) {
        console.log('Update error (expected):', updateError);
        
        if (updateError.code === 'PGRST204') {
          console.log('\n❌ Confirmed: image_url column does not exist');
          console.log('\n📝 To fix this, you have a few options:');
          console.log('1. Use the Supabase Dashboard: Database → Tables → components → Add Column');
          console.log('2. Use the SQL Editor in Supabase Dashboard:');
          console.log('   ALTER TABLE components ADD COLUMN image_url TEXT;');
          console.log('3. Enable direct database access in your Supabase settings');
        }
      } else {
        console.log('✅ Update successful! Column exists:', updateData);
      }
    }
    
  } catch (err) {
    console.log('Method 3 failed:', err.message);
  }
}

executeSQLThroughSupabase();