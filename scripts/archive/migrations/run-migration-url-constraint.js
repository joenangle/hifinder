#!/usr/bin/env node

/**
 * Run database migration to add unique constraint to url column
 * This enables upsert operations for updating listing status
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running migration: Add unique constraint to url column\n');

  // Read the SQL migration file
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251105_add_url_unique_constraint.sql');
  const sql = readFileSync(migrationPath, 'utf8');

  try {
    // Execute the SQL migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql RPC doesn't exist, we need to use the SQL editor approach
      console.log('⚠️  Direct SQL execution not available.');
      console.log('📋 Please run this SQL manually in Supabase SQL Editor:\n');
      console.log(sql);
      console.log('\n💡 Or use Supabase CLI: supabase db push');
      return;
    }

    console.log('✅ Migration completed successfully!');
    console.log('   - Cleaned up any duplicate URLs');
    console.log('   - Added unique constraint to url column');
    console.log('   - Added index for faster URL lookups');
    console.log('\n🔧 Scraper now supports automatic status updates for existing listings');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:\n');
    console.log(sql);
    process.exit(1);
  }
}

runMigration();
