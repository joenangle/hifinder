const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixLinterRLS() {
  console.log('🔧 Fixing Supabase linter RLS errors...\n');
  
  const sqlStatements = [
    // Components table
    "ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS \"Allow public read access\" ON public.components;",
    "CREATE POLICY \"Allow public read access\" ON public.components FOR SELECT USING (true);",
    
    // Used listings table
    "ALTER TABLE public.used_listings ENABLE ROW LEVEL SECURITY;", 
    "DROP POLICY IF EXISTS \"Allow public read access\" ON public.used_listings;",
    "CREATE POLICY \"Allow public read access\" ON public.used_listings FOR SELECT USING (true);"
  ];
  
  // Try multiple approaches to execute SQL
  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    console.log(`Executing (${i + 1}/${sqlStatements.length}): ${sql.substring(0, 60)}...`);
    
    let success = false;
    
    // Approach 1: Try using the sql function if it exists
    try {
      const { data, error } = await supabase.rpc('sql', { query: sql });
      if (!error) {
        console.log('✅ Applied via sql RPC');
        success = true;
      }
    } catch (e) {
      // Ignore, try next approach
    }
    
    if (!success) {
      // Approach 2: Try raw HTTP request to PostgREST
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Content-Type': 'application/sql',
            'Accept': 'application/json',
          },
          body: sql
        });
        
        if (response.ok) {
          console.log('✅ Applied via HTTP');
          success = true;
        }
      } catch (e) {
        // Ignore, try next approach
      }
    }
    
    if (!success) {
      // Approach 3: Try management API approach
      try {
        // This approach uses Supabase's edge functions or management API
        const response = await fetch(`${supabaseUrl.replace('supabase.co', 'supabase.co')}/functions/v1/execute-sql`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql })
        });
        
        if (response.ok) {
          console.log('✅ Applied via functions');
          success = true;
        }
      } catch (e) {
        // Ignore
      }
    }
    
    if (!success) {
      console.log('⚠️  Auto-execution failed - manual step required');
    }
  }
  
  console.log('\n🧪 Testing table access after changes...');
  
  // Test public access
  try {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anonKey) {
      console.log('⚠️  No anon key found for testing');
      return;
    }
    
    const anonClient = createClient(supabaseUrl, anonKey);
    
    // Test components
    const { data: compData, error: compError } = await anonClient
      .from('components')
      .select('id')
      .limit(1);
      
    if (compError) {
      console.log('❌ Components access failed:', compError.message);
    } else {
      console.log('✅ Components table accessible via anon key');
    }
    
    // Test used_listings
    const { data: listData, error: listError } = await anonClient
      .from('used_listings')
      .select('id')
      .limit(1);
      
    if (listError) {
      console.log('❌ Used listings access failed:', listError.message);
    } else {
      console.log('✅ Used listings table accessible via anon key');
    }
    
  } catch (err) {
    console.log('❌ Testing failed:', err.message);
  }
  
  console.log('\n📋 Manual SQL (if auto-execution failed):');
  console.log('Copy these commands to Supabase Dashboard > SQL Editor:\n');
  sqlStatements.forEach(sql => console.log(sql));
  
  console.log('\n🎯 Expected result:');
  console.log('✅ Supabase linter should no longer show RLS errors');
  console.log('✅ Public tables remain accessible to anonymous users');
  console.log('✅ Application functionality preserved');
}

fixLinterRLS();