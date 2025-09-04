const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for user_gear table...');
  
  try {
    // Test table access first
    console.log('📊 Testing current table access...');
    const { data: testData, error: testError } = await supabase
      .from('user_gear')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.log('❌ Current access blocked:', testError.message);
    } else {
      console.log('✅ Current access working');
    }
    
    // The simplest fix is to disable RLS temporarily
    // Since we're using NextAuth JWT, not Supabase Auth, RLS with auth.uid() won't work
    console.log('\n🛠️  Disabling RLS to allow service role access...');
    
    // We'll use raw SQL to disable RLS
    // Note: This is a temporary solution - in production you might want proper RLS
    const { data, error } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE public.user_gear DISABLE ROW LEVEL SECURITY;'
    }).catch(async () => {
      // If RPC doesn't work, try alternative approach
      console.log('RPC not available, trying alternative approach...');
      
      // We'll have to recommend manual steps
      return { data: null, error: { message: 'Manual intervention required' } };
    });
    
    if (error && error.message.includes('Manual intervention required')) {
      console.log('\n📋 MANUAL STEPS REQUIRED:');
      console.log('1. Go to your Supabase dashboard SQL editor');
      console.log('2. Run this command:');
      console.log('   ALTER TABLE public.user_gear DISABLE ROW LEVEL SECURITY;');
      console.log('\nThis will allow the service role to access the table.');
      console.log('Note: This disables RLS entirely. For production, consider implementing');
      console.log('proper RLS policies that work with your authentication system.');
      return;
    }
    
    // Test access again
    console.log('\n🧪 Testing access after fix...');
    const { data: postTestData, error: postTestError } = await supabase
      .from('user_gear')
      .select('id')
      .limit(1);
    
    if (postTestError) {
      console.log('❌ Still having issues:', postTestError.message);
      console.log('\n🔧 You may need to manually disable RLS in Supabase dashboard');
    } else {
      console.log('✅ Access now working!');
    }
    
  } catch (err) {
    console.log('❌ Exception:', err.message);
    console.log('\n📋 MANUAL FIX NEEDED:');
    console.log('Run this in Supabase SQL editor:');
    console.log('ALTER TABLE public.user_gear DISABLE ROW LEVEL SECURITY;');
  }
}

fixRLSPolicies();