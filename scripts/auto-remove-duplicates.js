#!/usr/bin/env node

/**
 * Auto-generated script to remove 9 duplicate entries
 * Generated: 2025-10-23T02:03:38.413Z
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const duplicateIds = [
  "c86be624-61ea-44b5-8ddd-b42e56b45675",
  "555f7562-e705-4772-bb5c-b5af2f305fa6",
  "2ef27ceb-c7c5-4f35-8afc-28cafa4b8532",
  "2c9238eb-16ea-4874-ab5b-194a2089b46b",
  "fa5e0089-45d4-4470-a81b-11a8215ac575",
  "44c11996-1011-48b8-85a9-36f213f0fb4f",
  "a71efea3-95a2-4889-8d32-0930e157b494",
  "912ffec9-eaa9-455a-9a10-7d61c41374e1",
  "4dde0bfc-2fe4-45fa-bb4a-cbf5ccd66373"
];

async function removeDuplicates() {
  console.log('🗑️  Removing 9 duplicate entries...\n');

  for (const id of duplicateIds) {
    const { error } = await supabase
      .from('components')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`❌ Error deleting ${id}:`, error);
    } else {
      console.log(`✅ Deleted ${id}`);
    }
  }

  console.log('\n✨ Cleanup complete!');
}

if (process.argv.includes('--execute')) {
  removeDuplicates().catch(console.error);
} else {
  console.log('🔍 DRY RUN - Run with --execute to delete duplicates');
  console.log(`Would delete ${duplicateIds.length} entries`);
}
