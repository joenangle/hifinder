const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyBlockingRLS() {
  console.log('🔐 Applying blocking RLS policies...\n');
  
  const policies = [
    // Drop existing policies and create blocking ones for user_gear
    'DROP POLICY IF EXISTS "Users can view own gear" ON public.user_gear;',
    'DROP POLICY IF EXISTS "Users can insert own gear" ON public.user_gear;',
    'DROP POLICY IF EXISTS "Users can update own gear" ON public.user_gear;',
    'DROP POLICY IF EXISTS "Users can delete own gear" ON public.user_gear;',
    'CREATE POLICY "Block all anon access" ON public.user_gear FOR ALL USING (false);',
    
    // Drop existing policies and create blocking ones for user_stacks
    'DROP POLICY IF EXISTS "Users can view own stacks" ON public.user_stacks;',
    'DROP POLICY IF EXISTS "Users can insert own stacks" ON public.user_stacks;',
    'DROP POLICY IF EXISTS "Users can update own stacks" ON public.user_stacks;',
    'DROP POLICY IF EXISTS "Users can delete own stacks" ON public.user_stacks;',
    'CREATE POLICY "Block all anon access" ON public.user_stacks FOR ALL USING (false);',
    
    // Drop existing policies and create blocking ones for stack_components
    'DROP POLICY IF EXISTS "Users can view stack components they own" ON public.stack_components;',
    'DROP POLICY IF EXISTS "Users can insert stack components they own" ON public.stack_components;',
    'DROP POLICY IF EXISTS "Users can update stack components they own" ON public.stack_components;',
    'DROP POLICY IF EXISTS "Users can delete stack components they own" ON public.stack_components;',
    'CREATE POLICY "Block all anon access" ON public.stack_components FOR ALL USING (false);'
  ];
  
  try {
    for (let i = 0; i < policies.length; i++) {
      const policy = policies[i];
      console.log(`Applying (${i + 1}/${policies.length}): ${policy.substring(0, 50)}...`);
      
      // Use raw SQL query instead of RPC
      const { error } = await supabase
        .from('_fake_table')  // This will cause it to use raw SQL mode
        .select('*')
        .limit(0);
        
      // Direct SQL approach using fetch
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: policy })
      });
      
      if (!response.ok) {
        // Try alternative approach with direct SQL
        console.log(`⚠️  RPC failed, trying direct execution...`);
        // This approach might not work, showing manual steps below
      } else {
        console.log(`✅ Applied`);
      }
    }
    
    console.log('\n🚨 MANUAL STEPS REQUIRED:');
    console.log('The automatic application may have failed.');
    console.log('Please go to Supabase Dashboard > SQL Editor and run:');
    console.log('');
    policies.forEach(policy => console.log(policy));
    console.log('');
    
    // Test the results
    console.log('🧪 Testing current access...');
    
    // Test anon access (should be blocked)
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    const { data: anonData, error: anonError } = await anonClient
      .from('user_gear')
      .select('id')
      .limit(1);
    
    if (anonError) {
      console.log('✅ Anon access BLOCKED (Good!)');
    } else if (anonData && anonData.length === 0) {
      console.log('⚠️  Anon access returns empty (may still be filtered by auth)');
    } else {
      console.log('❌ Anon access still allowed (SECURITY ISSUE!)');
    }
    
    // Test service role access (should work)
    const { data: serviceData, error: serviceError } = await supabase
      .from('user_gear')
      .select('id')
      .limit(1);
    
    if (serviceError) {
      console.log('❌ Service role access blocked');
    } else {
      console.log('✅ Service role access working');
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

applyBlockingRLS();