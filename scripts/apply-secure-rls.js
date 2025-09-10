const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRLSPolicies() {
  console.log('🔐 Applying secure RLS policies...\n');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'implement-secure-rls-policies.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📋 SQL script loaded');
    console.log('⚠️  This will lock down user tables to require API access');
    console.log('✅ Service role key will continue to work\n');
    
    // Note: Supabase doesn't have a direct SQL execution method via the JS client
    // We need to use the Supabase Dashboard or CLI
    
    console.log('📝 MANUAL STEPS REQUIRED:\n');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of:');
    console.log('   scripts/implement-secure-rls-policies.sql');
    console.log('4. Execute the script\n');
    
    console.log('Alternative: Use Supabase CLI');
    console.log('  supabase db push < scripts/implement-secure-rls-policies.sql\n');
    
    // Test current access
    console.log('🧪 Testing current access with service role key...');
    const { data, error } = await supabase
      .from('user_gear')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Error accessing user_gear:', error.message);
    } else {
      console.log('✅ Service role key can access user_gear');
    }
    
    // Show what will change
    console.log('\n📋 After applying the script:');
    console.log('  ✅ API routes will continue to work (using service role)');
    console.log('  ❌ Direct frontend queries will be blocked');
    console.log('  ✅ Components & used_listings remain public');
    console.log('  🔒 User data requires authentication via API\n');
    
    console.log('🔄 To rollback if needed:');
    console.log('  Run: scripts/rollback-rls-policies.sql');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

applyRLSPolicies();