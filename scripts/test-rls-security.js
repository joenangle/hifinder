const { createClient } = require('@supabase/supabase-js');

// Test with ANON key (should be blocked by RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔐 Testing RLS Security\n');
console.log('=' .repeat(50));

async function testAnonAccess() {
  console.log('\n1️⃣  Testing ANON key access (should be BLOCKED):');
  console.log('-'.repeat(40));
  
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  // Test user_gear access
  const { data: gearData, error: gearError } = await anonClient
    .from('user_gear')
    .select('id')
    .limit(1);
  
  if (gearError) {
    console.log('✅ user_gear: Access BLOCKED (Good!)');
    console.log('   Error:', gearError.message);
  } else {
    console.log('❌ user_gear: Access ALLOWED (Bad! RLS not working)');
    console.log('   Data:', gearData);
  }
  
  // Test user_stacks access
  const { data: stackData, error: stackError } = await anonClient
    .from('user_stacks')
    .select('id')
    .limit(1);
  
  if (stackError) {
    console.log('✅ user_stacks: Access BLOCKED (Good!)');
    console.log('   Error:', stackError.message);
  } else {
    console.log('❌ user_stacks: Access ALLOWED (Bad! RLS not working)');
    console.log('   Data:', stackData);
  }
  
  // Test components access (should be allowed - public table)
  const { data: compData, error: compError } = await anonClient
    .from('components')
    .select('id')
    .limit(1);
  
  if (compError) {
    console.log('❌ components: Access BLOCKED (Bad! Should be public)');
    console.log('   Error:', compError.message);
  } else {
    console.log('✅ components: Access ALLOWED (Good! Public table)');
  }
}

async function testServiceRoleAccess() {
  console.log('\n2️⃣  Testing SERVICE ROLE key access (should be ALLOWED):');
  console.log('-'.repeat(40));
  
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  
  // Test user_gear access
  const { data: gearData, error: gearError } = await serviceClient
    .from('user_gear')
    .select('id')
    .limit(1);
  
  if (gearError) {
    console.log('❌ user_gear: Access BLOCKED (Bad! Service role should bypass RLS)');
    console.log('   Error:', gearError.message);
  } else {
    console.log('✅ user_gear: Access ALLOWED (Good!)');
  }
  
  // Test user_stacks access
  const { data: stackData, error: stackError } = await serviceClient
    .from('user_stacks')
    .select('id')
    .limit(1);
  
  if (stackError) {
    console.log('❌ user_stacks: Access BLOCKED (Bad! Service role should bypass RLS)');
    console.log('   Error:', stackError.message);
  } else {
    console.log('✅ user_stacks: Access ALLOWED (Good!)');
  }
}

async function runTests() {
  try {
    await testAnonAccess();
    await testServiceRoleAccess();
    
    console.log('\n' + '='.repeat(50));
    console.log('🏁 Security Test Complete\n');
    console.log('Summary:');
    console.log('- If user tables show "Access BLOCKED" for anon: ✅ RLS is working');
    console.log('- If user tables show "Access ALLOWED" for service role: ✅ API routes will work');
    console.log('- If components show "Access ALLOWED" for anon: ✅ Public data accessible\n');
  } catch (err) {
    console.error('Test error:', err.message);
  }
}

runTests();