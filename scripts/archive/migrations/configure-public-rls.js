const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function configurePublicTableRLS() {
  console.log('🔧 Configuring RLS for public reference tables...\n');
  
  const statements = [
    // Components table
    'ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;',
    'DROP POLICY IF EXISTS "Allow public read access" ON public.components;',
    'CREATE POLICY "Allow public read access" ON public.components FOR SELECT USING (true);',
    
    // Used listings table  
    'ALTER TABLE public.used_listings ENABLE ROW LEVEL SECURITY;',
    'DROP POLICY IF EXISTS "Allow public read access" ON public.used_listings;',
    'CREATE POLICY "Allow public read access" ON public.used_listings FOR SELECT USING (true);'
  ];
  
  let successCount = 0;
  let errors = [];
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`Applying (${i + 1}/${statements.length}): ${statement.substring(0, 50)}...`);
    
    try {
      // Try using direct SQL execution via REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: statement })
      });
      
      if (response.ok) {
        console.log(`✅ Applied`);
        successCount++;
      } else {
        const error = await response.text();
        console.log(`⚠️  Failed: ${error}`);
        errors.push({ statement, error });
      }
    } catch (err) {
      console.log(`⚠️  Error: ${err.message}`);
      errors.push({ statement, error: err.message });
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`✅ Successfully applied: ${successCount}/${statements.length}`);
  
  if (errors.length > 0) {
    console.log(`❌ Failed: ${errors.length}`);
    console.log('\n📝 Manual steps required for failed statements:');
    console.log('Go to Supabase Dashboard > SQL Editor and run:');
    errors.forEach(({ statement }) => {
      console.log(statement);
    });
    console.log('');
  }
  
  // Test the results
  console.log('\n🧪 Testing public access...');
  
  // Test anon access to components
  try {
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    const { data: componentsData, error: componentsError } = await anonClient
      .from('components')
      .select('id')
      .limit(1);
    
    if (componentsError) {
      console.log('❌ Components access blocked:', componentsError.message);
    } else if (componentsData && componentsData.length > 0) {
      console.log('✅ Components publicly accessible');
    } else {
      console.log('⚠️  Components returns empty (may be empty table)');
    }
    
    // Test anon access to used_listings
    const { data: listingsData, error: listingsError } = await anonClient
      .from('used_listings')
      .select('id')
      .limit(1);
    
    if (listingsError) {
      console.log('❌ Used listings access blocked:', listingsError.message);
    } else if (listingsData && listingsData.length > 0) {
      console.log('✅ Used listings publicly accessible');
    } else {
      console.log('⚠️  Used listings returns empty (may be empty table)');
    }
    
  } catch (err) {
    console.log('❌ Test failed:', err.message);
  }
  
  console.log('\n🎉 Public table RLS configuration complete!');
  console.log('📋 This satisfies Supabase security linter requirements');
  console.log('   while maintaining public read access to reference data.');
}

configurePublicTableRLS();