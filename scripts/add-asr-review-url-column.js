#!/usr/bin/env node

/**
 * Add asr_review_url column to components table
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('Adding asr_review_url column to components table...\n');

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE components
      ADD COLUMN IF NOT EXISTS asr_review_url TEXT;
    `
  });

  if (error) {
    console.error('Error:', error.message);

    // Try alternative approach using direct SQL execution
    console.log('\nTrying alternative approach via Supabase client...');

    const { error: altError } = await supabase
      .from('components')
      .select('asr_review_url')
      .limit(1);

    if (altError && altError.message.includes('column') && altError.message.includes('does not exist')) {
      console.log('\nColumn confirmed missing. Please run this SQL in Supabase SQL Editor:');
      console.log('\n' + '='.repeat(60));
      console.log('ALTER TABLE components ADD COLUMN IF NOT EXISTS asr_review_url TEXT;');
      console.log('='.repeat(60) + '\n');
    } else {
      console.log('✅ Column asr_review_url already exists or was successfully added!\n');
    }
  } else {
    console.log('✅ Column added successfully!\n');
  }
}

main();
