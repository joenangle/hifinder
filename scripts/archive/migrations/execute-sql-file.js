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

async function executeSQLFile(filePath) {
  try {
    console.log(`Reading SQL file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    console.log('SQL Content:');
    console.log('---');
    console.log(sqlContent);
    console.log('---');
    
    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`\nFound ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\nExecuting statement ${i + 1}:`);
      console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
      
      try {
        // Try to execute via RPC if available, otherwise note the limitation
        const result = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          },
          body: JSON.stringify({ query: statement })
        });
        
        if (result.ok) {
          console.log('✅ Statement executed successfully via RPC');
        } else {
          const errorText = await result.text();
          console.log('❌ RPC execution failed:', errorText);
          console.log('💡 Note: Direct SQL execution requires database admin access');
        }
      } catch (err) {
        console.log('❌ Error executing statement:', err.message);
      }
    }
    
    console.log('\n📋 Summary:');
    console.log('- Supabase CLI is set up for local development');
    console.log('- SQL migration file created');
    console.log('- For production database changes, use the Supabase Dashboard SQL Editor');
    
  } catch (err) {
    console.error('Error reading or executing SQL file:', err);
    process.exit(1);
  }
}

// Get the SQL file path from command line argument or use default
const sqlFile = process.argv[2] || '/Users/joe/hifinder/supabase/migrations/20250904_add_image_url.sql';
executeSQLFile(sqlFile);