// Add missing updated_at column to components table
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addUpdatedAtColumn() {
  console.log('🔧 Adding updated_at column to components table...\n');
  
  try {
    // First check if the column already exists
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'components')
      .eq('column_name', 'updated_at');
      
    if (checkError) {
      console.log('⚠️  Could not check existing columns, proceeding with alter...');
    } else if (columns && columns.length > 0) {
      console.log('✅ updated_at column already exists!');
      return;
    }
    
    // Use the SQL function to add the column
    const { data, error } = await supabase.rpc('sql', {
      query: `
        ALTER TABLE components 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Update existing rows to have updated_at = created_at if created_at exists
        UPDATE components 
        SET updated_at = COALESCE(created_at, NOW()) 
        WHERE updated_at IS NULL;
      `
    });
    
    if (error) {
      console.error('❌ Error adding updated_at column:', error);
      
      // Try alternative approach using a raw query
      console.log('🔄 Trying alternative approach...');
      const { data: altData, error: altError } = await supabase
        .from('components')
        .select('id')
        .limit(1);
        
      if (altError) {
        console.error('❌ Cannot access components table:', altError);
        return;
      }
      
      console.log('⚠️  Manual intervention needed:');
      console.log('Please run this SQL in Supabase dashboard:');
      console.log('ALTER TABLE components ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
      console.log('UPDATE components SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;');
      return;
    }
    
    console.log('✅ updated_at column added successfully!');
    console.log(data);
    
  } catch (err) {
    console.error('💥 Fatal error:', err);
    console.log('\n⚠️  Manual SQL needed in Supabase dashboard:');
    console.log('ALTER TABLE components ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();');
    console.log('UPDATE components SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;');
  }
}

if (require.main === module) {
  addUpdatedAtColumn();
}

module.exports = { addUpdatedAtColumn };