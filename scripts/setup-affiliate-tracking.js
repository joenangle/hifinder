/**
 * Setup affiliate tracking tables and policies
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupAffiliateTables() {
  console.log('🚀 Setting up affiliate tracking tables...\n');

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, 'create-affiliate-tracking-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Note: You'll need to replace 'joe@example.com' with your actual admin email
    const adminEmail = process.env.ADMIN_EMAIL || 'joe@example.com';
    const finalSql = sql.replace(/joe@example\.com/g, adminEmail);

    console.log(`📧 Using admin email: ${adminEmail}`);
    console.log('⚠️  Make sure to update ADMIN_EMAIL in .env.local\n');

    // Execute SQL via Supabase SQL Editor or manually
    console.log('📝 SQL script prepared. To execute:');
    console.log('\n1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Copy the contents of: scripts/create-affiliate-tracking-tables.sql');
    console.log(`3. Replace 'joe@example.com' with: ${adminEmail}`);
    console.log('4. Run the query\n');

    console.log('OR execute directly (requires psql):');
    console.log(`psql ${process.env.DATABASE_URL} < scripts/create-affiliate-tracking-tables.sql\n`);

    // Verify tables exist (will fail if not created yet)
    const { data: tables, error } = await supabase
      .from('affiliate_clicks')
      .select('count')
      .limit(0);

    if (!error) {
      console.log('✅ affiliate_clicks table exists');
    } else {
      console.log('⚠️  affiliate_clicks table not created yet');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

if (require.main === module) {
  setupAffiliateTables()
    .then(() => {
      console.log('✅ Setup instructions displayed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { setupAffiliateTables };
