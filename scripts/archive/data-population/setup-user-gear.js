const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupUserGear() {
  console.log('🚀 Setting up user_gear table...\n');
  
  // First check if table already exists
  const { data: existingTable, error: checkError } = await supabase
    .from('user_gear')
    .select('id')
    .limit(1);
  
  if (!checkError || checkError.code !== '42P01') {
    console.log('✅ user_gear table already exists!');
    
    // Test insert
    console.log('\n🧪 Testing table functionality...');
    const testData = {
      user_id: 'test-user-123',
      custom_name: 'Test Headphones',
      custom_brand: 'Test Brand',
      custom_category: 'headphones',
      purchase_price: 100,
      condition: 'new',
      is_active: true,
      is_loaned: false
    };
    
    const { data: insertTest, error: insertError } = await supabase
      .from('user_gear')
      .insert(testData)
      .select()
      .single();
    
    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message);
    } else {
      console.log('✅ Insert test succeeded!');
      
      // Clean up test data
      const { error: deleteError } = await supabase
        .from('user_gear')
        .delete()
        .eq('id', insertTest.id);
      
      if (!deleteError) {
        console.log('✅ Cleanup successful');
      }
    }
    
    return true;
  }
  
  console.log('❌ Table does not exist. Please create it using the Supabase SQL editor.\n');
  console.log('📝 Instructions:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to the SQL Editor');
  console.log('3. Open and run the file: scripts/create-user-gear-table.sql');
  console.log('4. Then run this script again to verify');
  
  return false;
}

setupUserGear().catch(console.error);