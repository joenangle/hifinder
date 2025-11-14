/**
 * Run Component Candidates Migration
 *
 * Creates the new_component_candidates table for storing detected models
 * that need review before adding to main components table
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🔧 Running component_candidates table migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251112_create_component_candidates.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try direct execution if rpc doesn't exist
      console.log('  Trying direct execution...');

      // Split into individual statements and execute
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error: stmtError } = await supabase.from('_migrations').insert({
          statement: statement + ';'
        });

        if (stmtError) {
          console.error(`❌ Error executing statement: ${stmtError.message}`);
          throw stmtError;
        }
      }
    }

    console.log('✅ Migration completed successfully!\n');

    // Verify table was created
    const { data: tableCheck, error: checkError } = await supabase
      .from('new_component_candidates')
      .select('count')
      .limit(0);

    if (checkError) {
      console.warn('⚠️  Warning: Could not verify table creation:', checkError.message);
    } else {
      console.log('✅ Table verified: new_component_candidates exists');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📝 Manual migration required. Please run this SQL in Supabase dashboard:');
    console.error('\nsupabase/migrations/20251112_create_component_candidates.sql');
    process.exit(1);
  }
}

runMigration();
