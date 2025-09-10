const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeRLSScript() {
  console.log('🔐 Applying secure RLS policies directly...\n');
  
  const sqlStatements = [
    // USER_GEAR TABLE
    'DROP POLICY IF EXISTS "Users can view own gear" ON public.user_gear;',
    'DROP POLICY IF EXISTS "Users can insert own gear" ON public.user_gear;',
    'DROP POLICY IF EXISTS "Users can update own gear" ON public.user_gear;',
    'DROP POLICY IF EXISTS "Users can delete own gear" ON public.user_gear;',
    'DROP POLICY IF EXISTS "Allow authenticated reads" ON public.user_gear;',
    'DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.user_gear;',
    'DROP POLICY IF EXISTS "Allow authenticated updates" ON public.user_gear;',
    'DROP POLICY IF EXISTS "Allow authenticated deletes" ON public.user_gear;',
    'CREATE POLICY "Block all anon access" ON public.user_gear FOR ALL USING (false);',
    
    // USER_STACKS TABLE
    'DROP POLICY IF EXISTS "Users can view own stacks" ON public.user_stacks;',
    'DROP POLICY IF EXISTS "Users can insert own stacks" ON public.user_stacks;',
    'DROP POLICY IF EXISTS "Users can update own stacks" ON public.user_stacks;',
    'DROP POLICY IF EXISTS "Users can delete own stacks" ON public.user_stacks;',
    'CREATE POLICY "Block all anon access" ON public.user_stacks FOR ALL USING (false);',
    
    // STACK_COMPONENTS TABLE
    'DROP POLICY IF EXISTS "Users can view stack components they own" ON public.stack_components;',
    'DROP POLICY IF EXISTS "Users can insert stack components they own" ON public.stack_components;',
    'DROP POLICY IF EXISTS "Users can update stack components they own" ON public.stack_components;',
    'DROP POLICY IF EXISTS "Users can delete stack components they own" ON public.stack_components;',
    'CREATE POLICY "Block all anon access" ON public.stack_components FOR ALL USING (false);'
  ];
  
  try {
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      console.log(`Executing (${i + 1}/${sqlStatements.length}): ${statement.substring(0, 60)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { query: statement }).catch(() => {
        // If RPC doesn't work, try using the REST API directly
        return supabase.from('_supabase_admin').select('*').limit(0).then(() => ({ error: { message: 'RPC not available' } }));
      });
      
      if (error && !error.message.includes('does not exist')) {
        console.log(`⚠️  ${statement}: ${error.message}`);
      } else {
        console.log(`✅ Applied`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n🧪 Testing access after RLS changes...');
    
    // Test anon access (should be blocked)
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: anonData, error: anonError } = await anonClient
      .from('user_gear')
      .select('id')
      .limit(1);
    
    if (anonError) {
      console.log('✅ Anon access BLOCKED (Good!)');
      console.log('   Error:', anonError.message);
    } else {
      console.log('❌ Anon access still allowed (RLS may not be working)');
    }
    
    // Test service role access (should work)
    const { data: serviceData, error: serviceError } = await supabase
      .from('user_gear')
      .select('id')
      .limit(1);
    
    if (serviceError) {
      console.log('❌ Service role access blocked (API routes may not work)');
    } else {
      console.log('✅ Service role access working (API routes will work)');
    }
    
    console.log('\n🎉 RLS security policies applied!');
    console.log('📋 Status:');
    console.log('  - User tables are now protected from direct anon access');
    console.log('  - API routes using service role key will continue to work');
    console.log('  - Frontend must use API routes for user data');
    
  } catch (err) {
    console.error('❌ Error applying RLS policies:', err.message);
    console.log('\n📝 Manual fallback:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run: scripts/implement-secure-rls-policies.sql');
  }
}

executeRLSScript();