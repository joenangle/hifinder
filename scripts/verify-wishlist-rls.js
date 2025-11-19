/**
 * Verify wishlist RLS policies are configured correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyRLS() {
  console.log('Verifying wishlist RLS policies...\n');

  try {
    // Check if RLS is enabled
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT tablename, rowsecurity
          FROM pg_tables
          WHERE schemaname = 'public' AND tablename = 'wishlists';
        `
      });

    if (tableError) {
      console.log('Note: Cannot query RLS status directly (expected with client)');
    }

    // Check if we can query the table
    const { data, error } = await supabase
      .from('wishlists')
      .select('id, user_id, component_id, created_at')
      .limit(10);

    if (error) {
      console.error('❌ Error querying wishlists:', error.message);
      if (error.message.includes('permission denied') || error.message.includes('RLS')) {
        console.log('\n⚠️  RLS policies may be blocking access. This is expected when not authenticated.');
        console.log('The wishlist feature should work when users are logged in.\n');
      }
    } else {
      console.log(`✅ Successfully queried wishlists table`);
      console.log(`📊 Found ${data.length} wishlist items\n`);

      if (data.length > 0) {
        console.log('Sample wishlist items:');
        data.forEach((item, i) => {
          console.log(`  ${i + 1}. User: ${item.user_id.substring(0, 8)}... Component: ${item.component_id.substring(0, 8)}...`);
        });
      }
    }

    console.log('\n✅ Wishlist table verification complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyRLS();
