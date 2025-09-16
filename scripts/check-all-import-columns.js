const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllImportColumns() {
  try {
    console.log('🔧 Checking all columns required by import script...\n');

    // List all columns that the import script ACTUALLY tries to use (from lines 170-189)
    const requiredColumns = [
      'id',
      'name',
      'brand',
      'category',
      'price_new',           // Not 'price'!
      'price_used_min',
      'price_used_max',
      'crinacle_rank',
      'budget_tier',
      'sound_signature',
      'why_recommended',     // Not 'why'!
      'needs_amp',
      'source',
      'created_at',
      'tone_grade',
      'technical_grade',
      'value_rating'
    ];

    console.log('🔍 Required columns for import:');
    requiredColumns.forEach(col => console.log(`   • ${col}`));
    console.log('');

    const missingColumns = [];
    const existingColumns = [];

    // Check each column by trying to select it
    for (const column of requiredColumns) {
      try {
        const { data, error } = await supabase
          .from('components')
          .select(column)
          .limit(1);

        if (!error) {
          existingColumns.push(column);
          console.log(`✅ ${column}`);
        } else if (error.code === '42703' || error.message.includes(`column "${column}" does not exist`)) {
          missingColumns.push(column);
          console.log(`❌ ${column} - missing`);
        } else {
          console.log(`⚠️  ${column} - unexpected error: ${error.message}`);
        }
      } catch (err) {
        console.log(`⚠️  ${column} - check failed: ${err.message}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Existing: ${existingColumns.length}/${requiredColumns.length}`);
    console.log(`   Missing: ${missingColumns.length}`);

    if (missingColumns.length > 0) {
      console.log('\n📝 To add missing columns, run this SQL in your Supabase Dashboard:');
      console.log('   Dashboard → SQL Editor → Copy and paste this SQL:\n');

      missingColumns.forEach(column => {
        let columnType = 'TEXT';
        if (column.includes('price_')) columnType = 'INTEGER';
        if (column === 'needs_amp') columnType = 'BOOLEAN DEFAULT false';
        if (column.includes('_at')) columnType = 'TIMESTAMPTZ DEFAULT NOW()';
        if (column === 'value_rating') columnType = 'DECIMAL(3,1)';

        console.log(`ALTER TABLE components ADD COLUMN IF NOT EXISTS ${column} ${columnType};`);
      });

      console.log('\n🎯 After running this SQL, the import script should work.');
    } else {
      console.log('\n🎉 All required columns exist! Import script should work.');
    }

  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
}

checkAllImportColumns();