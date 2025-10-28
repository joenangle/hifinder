const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testGearAddition() {
  console.log('🧪 Testing gear addition functionality...');
  
  try {
    // Test data for adding gear
    const testUserId = 'test-user-123';
    const testGearData = {
      user_id: testUserId,
      custom_name: 'HD 650',
      custom_brand: 'Sennheiser',
      custom_category: 'headphones',
      purchase_price: 399.95,
      purchase_date: '2024-01-01',
      condition: 'new',
      purchase_location: 'Amazon',
      notes: 'Test entry',
      is_active: true,
      is_loaned: false
    };
    
    console.log('📝 Attempting to add test gear item...');
    console.log('Data:', JSON.stringify(testGearData, null, 2));
    
    const { data, error } = await supabase
      .from('user_gear')
      .insert(testGearData)
      .select()
      .single();
    
    if (error) {
      console.log('❌ Error adding gear:', error.message);
      console.log('Error details:', error);
      return false;
    }
    
    if (data) {
      console.log('✅ Successfully added gear item!');
      console.log('Added item:', JSON.stringify(data, null, 2));
      
      // Clean up - remove the test item
      console.log('\n🧹 Cleaning up test item...');
      const { error: deleteError } = await supabase
        .from('user_gear')
        .delete()
        .eq('id', data.id);
      
      if (deleteError) {
        console.log('⚠️  Warning: Could not delete test item:', deleteError.message);
      } else {
        console.log('✅ Test item cleaned up');
      }
      
      return true;
    }
    
    console.log('❌ No data returned from insert');
    return false;
    
  } catch (err) {
    console.log('❌ Exception during test:', err.message);
    return false;
  }
}

async function testUserGearQuery() {
  console.log('\n🔍 Testing user gear query with component join...');
  
  try {
    const { data, error } = await supabase
      .from('user_gear')
      .select(`
        *,
        components (
          id,
          name,
          brand,
          category,
          price_new,
          price_used_min,
          price_used_max,
          budget_tier,
          sound_signature,
          use_cases,
          impedance,
          needs_amp,
          amazon_url,
          why_recommended
        )
      `)
      .limit(5);
    
    if (error) {
      console.log('❌ Error querying gear:', error.message);
      return false;
    }
    
    console.log('✅ Query successful!');
    console.log(`Found ${data?.length || 0} items`);
    
    if (data && data.length > 0) {
      console.log('Sample item:', JSON.stringify(data[0], null, 2));
    }
    
    return true;
    
  } catch (err) {
    console.log('❌ Exception during query test:', err.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting user gear functionality tests...\n');
  
  const insertTest = await testGearAddition();
  const queryTest = await testUserGearQuery();
  
  console.log('\n📊 Test Results:');
  console.log(`Insert test: ${insertTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Query test: ${queryTest ? '✅ PASS' : '❌ FAIL'}`);
  
  if (insertTest && queryTest) {
    console.log('\n🎉 All tests passed! User gear functionality should be working.');
  } else {
    console.log('\n❌ Some tests failed. Check the errors above.');
  }
}

runTests();