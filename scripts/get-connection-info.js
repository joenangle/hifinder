const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Role Key (first 20 chars):', supabaseKey?.substring(0, 20) + '...');

// Extract project reference from URL
const urlParts = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (urlParts) {
  const projectRef = urlParts[1];
  console.log('Project Reference:', projectRef);
  
  console.log('\n=== Potential Connection Details ===');
  console.log('Direct connection host:', `db.${projectRef}.supabase.co`);
  console.log('Pooler connection host:', `aws-0-us-east-1.pooler.supabase.com`);
  console.log('Port (direct):', '5432');
  console.log('Port (pooler):', '6543');
  console.log('Database:', 'postgres');
  console.log('Username (pooler):', `postgres.${projectRef}`);
  console.log('Username (direct):', 'postgres');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('\n=== Testing Supabase Connection ===');
    
    const { data, error } = await supabase
      .from('components')
      .select('count')
      .limit(1);
      
    if (error) {
      console.log('Connection error:', error);
    } else {
      console.log('✅ Supabase connection works fine');
    }
  } catch (err) {
    console.log('Connection test error:', err.message);
  }
}

testConnection();