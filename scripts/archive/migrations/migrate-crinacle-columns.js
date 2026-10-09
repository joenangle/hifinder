require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function migrateCrinacleColumns() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log('🔄 Starting Crinacle column migration...\n');

    // Rename columns using Supabase RPC (needs to be done via raw SQL)
    const migrations = [
      { old: 'tone_grade', new: 'crin_tone' },
      { old: 'crinacle_rank', new: 'crin_rank' },
      { old: 'technical_grade', new: 'crin_tech' },
      { old: 'value_rating', new: 'crin_value' },
      { old: 'crinacle_sound_signature', new: 'crin_signature' },
      { old: 'crinacle_comments', new: 'crin_comments' }
    ];

    for (const { old, new: newName } of migrations) {
      console.log(`  Renaming ${old} → ${newName}...`);
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE components RENAME COLUMN ${old} TO ${newName}`
      });

      if (error) throw error;
    }

    console.log('\n✅ All columns renamed successfully!\n');

    // Verify the changes by querying a component with Crinacle data
    console.log('📊 Verifying migration with sample data:');
    const { data: sample, error: sampleError } = await supabase
      .from('components')
      .select('id, brand, model, crin_tone, crin_tech, crin_rank, crin_value, crin_signature')
      .not('crin_tone', 'is', null)
      .limit(1);

    if (sampleError) {
      console.error('❌ Verification failed:', sampleError.message);
    } else if (sample && sample.length > 0) {
      console.log('✓ Successfully queried using new column names:');
      console.log(JSON.stringify(sample[0], null, 2));
      console.log('\n✅ Migration completed successfully!\n');
    } else {
      console.log('⚠️  No components with Crinacle data found for verification');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nTo rollback, run the following SQL manually:');
    console.error('ALTER TABLE components RENAME COLUMN crin_tone TO tone_grade;');
    console.error('ALTER TABLE components RENAME COLUMN crin_rank TO crinacle_rank;');
    console.error('ALTER TABLE components RENAME COLUMN crin_tech TO technical_grade;');
    console.error('ALTER TABLE components RENAME COLUMN crin_value TO value_rating;');
    console.error('ALTER TABLE components RENAME COLUMN crin_signature TO crinacle_sound_signature;');
    console.error('ALTER TABLE components RENAME COLUMN crin_comments TO crinacle_comments;');
    process.exit(1);
  }
}

migrateCrinacleColumns();
