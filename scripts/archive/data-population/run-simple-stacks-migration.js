const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Running simple stacks migration...\n');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250904_simple_stacks.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('❌ Migration failed:', error);
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('📊 Created tables:');
      console.log('   • user_stacks (for stack definitions)');
      console.log('   • stack_components (for gear-to-stack relationships)');
      console.log('\n🔓 RLS is disabled - authorization handled in app layer');
      console.log('🎯 Ready to test stack creation!');
    }
    
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
}

runMigration();