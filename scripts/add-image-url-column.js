const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addImageUrlColumn() {
  try {
    console.log('Checking if image_url column exists...');
    
    // Try to select a record to see current schema
    const { data: testData } = await supabase
      .from('components')
      .select('*')
      .limit(1);

    if (testData && testData[0] && 'image_url' in testData[0]) {
      console.log('✅ image_url column already exists');
      return;
    }

    console.log('Column does not exist. Since we cannot execute DDL through the client,');
    console.log('we will need to add it through the Supabase dashboard or use a direct PostgreSQL connection.');
    console.log('For now, we will proceed with updating the record assuming the column exists.');
    
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
}

addImageUrlColumn();