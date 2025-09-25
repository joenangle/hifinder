/**
 * Setup script for listing aggregation infrastructure
 * Creates necessary database tables and sets up monitoring
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupAggregationInfrastructure() {
  console.log('🚀 Setting up listing aggregation infrastructure...');

  try {
    // Read and execute SQL schema
    const sqlPath = path.join(__dirname, 'create-aggregation-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (const statement of statements) {
      try {
        if (statement.startsWith('--') || statement.length === 0) continue;

        const { error } = await supabase.rpc('exec_sql', { query: statement });

        if (error) {
          console.error(`❌ SQL Error: ${error.message}`);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
        }
      } catch (error) {
        console.error(`❌ Failed to execute statement:`, error);
      }
    }

    console.log('✅ Database schema setup completed');

    // Test table creation
    console.log('🧪 Testing table access...');

    const tables = [
      'used_listings_archive',
      'aggregation_stats',
      'aggregation_errors',
      'listing_moderation',
      'price_history'
    ];

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.error(`❌ Cannot access table ${table}:`, error.message);
      } else {
        console.log(`✅ Table ${table} accessible`);
      }
    }

    // Create initial aggregation stats entry
    console.log('📊 Creating initial stats entry...');
    const { error: statsError } = await supabase
      .from('aggregation_stats')
      .insert({
        run_date: new Date().toISOString(),
        reddit_total: 0,
        reddit_new: 0,
        ebay_total: 0,
        ebay_new: 0,
        duration_ms: 0
      });

    if (statsError) {
      console.error('❌ Failed to create initial stats:', statsError);
    } else {
      console.log('✅ Initial stats entry created');
    }

    console.log('\n🎉 Aggregation infrastructure setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Set up Reddit API credentials in .env.local');
    console.log('2. Set up eBay API credentials in .env.local');
    console.log('3. Test scrapers manually: npm run scrape:reddit');
    console.log('4. Set up automated scheduling (cron job or GitHub Actions)');

  } catch (error) {
    console.error('💥 Setup failed:', error);
    throw error;
  }
}

// Helper function to create exec_sql function if it doesn't exist
async function ensureExecFunction() {
  const createExecFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(query text)
    RETURNS void AS $$
    BEGIN
      EXECUTE query;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { query: createExecFunction });
    if (error && !error.message.includes('already exists')) {
      throw error;
    }
  } catch (error) {
    // Function might not exist yet, try direct execution
    console.log('Creating exec_sql function...');
  }
}

if (require.main === module) {
  setupAggregationInfrastructure()
    .then(() => {
      console.log('✅ Setup completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = {
  setupAggregationInfrastructure
};