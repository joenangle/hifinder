const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createUserGearTable() {
  console.log('🚀 Creating user_gear table...');
  
  // Read the SQL file
  const sql = fs.readFileSync('scripts/create-user-gear-table.sql', 'utf8');
  
  // Split into individual statements
  const statements = sql.split(';').filter(statement => statement.trim().length > 0);
  
  for (const statement of statements) {
    const cleanStatement = statement.trim();
    if (!cleanStatement) continue;
    
    console.log(`Executing: ${cleanStatement.substring(0, 60)}...`);
    
    try {
      // For table creation, we'll use a simple approach
      if (cleanStatement.includes('CREATE TABLE')) {
        // Extract table creation SQL
        const { error } = await supabase.rpc('exec', {
          sql_query: cleanStatement
        });
        
        if (error) {
          console.log(`❌ Error: ${error.message}`);
          // Try alternative method - direct query
          console.log('Trying alternative approach...');
          
          // Let's create the table manually with direct SQL
          const createTableSQL = `
            CREATE TABLE IF NOT EXISTS public.user_gear (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id TEXT NOT NULL,
              component_id UUID REFERENCES public.components(id) ON DELETE CASCADE,
              
              -- Purchase details
              purchase_date DATE,
              purchase_price DECIMAL(10, 2),
              purchase_location TEXT,
              condition TEXT CHECK (condition IN ('new', 'used', 'refurbished', 'b-stock')),
              
              -- Item details
              custom_name TEXT,
              custom_brand TEXT,
              custom_category TEXT,
              serial_number TEXT,
              
              -- Status and notes
              is_active BOOLEAN DEFAULT true,
              is_loaned BOOLEAN DEFAULT false,
              loaned_to TEXT,
              loaned_date DATE,
              notes TEXT,
              
              -- Metadata
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );
          `;
          
          // Try using supabase-js SQL template
          const { data, error: createError } = await supabase
            .rpc('exec', { sql: createTableSQL })
            .catch(() => ({ data: null, error: { message: 'RPC not available' } }));
          
          if (createError) {
            console.log('❌ Could not create via RPC. Manual creation needed.');
            console.log('\n📋 MANUAL STEPS REQUIRED:');
            console.log('1. Go to your Supabase dashboard');
            console.log('2. Navigate to SQL Editor');
            console.log('3. Copy and run this SQL:');
            console.log('\n' + createTableSQL);
            return false;
          }
        } else {
          console.log('✅ Success');
        }
      }
    } catch (err) {
      console.log(`❌ Exception: ${err.message}`);
    }
  }
  
  // Test if table exists now
  console.log('\n🔍 Testing table access...');
  const { data, error } = await supabase
    .from('user_gear')
    .select('id')
    .limit(1);
  
  if (error) {
    console.log('❌ Table still not accessible:', error.message);
    
    console.log('\n📋 MANUAL CREATION REQUIRED:');
    console.log('Please create the table manually in Supabase:');
    console.log('1. Go to: https://supabase.com/dashboard/project/[your-project]/sql');
    console.log('2. Copy the contents of scripts/create-user-gear-table.sql');
    console.log('3. Paste and run in the SQL editor');
    
    return false;
  } else {
    console.log('✅ Table created successfully!');
    return true;
  }
}

createUserGearTable();