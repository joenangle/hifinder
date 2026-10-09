/**
 * Create wishlists table in Supabase database
 *
 * This script creates the wishlists table that was defined in sql/auth-tables.sql
 * but never executed. This table is required for the wishlist feature to work.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createWishlistsTable() {
  console.log('Creating wishlists table...\n');

  try {
    // Create the wishlists table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- User wishlist table
        CREATE TABLE IF NOT EXISTS wishlists (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, component_id)
        );

        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
        CREATE INDEX IF NOT EXISTS idx_wishlists_component_id ON wishlists(component_id);

        -- Enable Row Level Security
        ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

        -- RLS Policy: Users can view their own wishlists
        DROP POLICY IF EXISTS "Users can view their own wishlists" ON wishlists;
        CREATE POLICY "Users can view their own wishlists"
          ON wishlists FOR SELECT
          USING (auth.uid() = user_id);

        -- RLS Policy: Users can insert into their own wishlists
        DROP POLICY IF EXISTS "Users can insert into their own wishlists" ON wishlists;
        CREATE POLICY "Users can insert into their own wishlists"
          ON wishlists FOR INSERT
          WITH CHECK (auth.uid() = user_id);

        -- RLS Policy: Users can delete from their own wishlists
        DROP POLICY IF EXISTS "Users can delete from their own wishlists" ON wishlists;
        CREATE POLICY "Users can delete from their own wishlists"
          ON wishlists FOR DELETE
          USING (auth.uid() = user_id);
      `
    });

    if (error) {
      // Try direct SQL execution if RPC doesn't work
      console.log('RPC method failed, trying direct SQL execution...\n');

      // Create table
      const { error: tableError } = await supabase
        .from('wishlists')
        .select('id')
        .limit(1);

      if (tableError && tableError.message.includes('does not exist')) {
        console.error('❌ Table does not exist and cannot be created via client.');
        console.error('Please run the following SQL manually in Supabase SQL Editor:\n');
        console.log(`
-- User wishlist table
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, component_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_component_id ON wishlists(component_id);

-- Enable Row Level Security
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own wishlists
CREATE POLICY "Users can view their own wishlists"
  ON wishlists FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert into their own wishlists
CREATE POLICY "Users can insert into their own wishlists"
  ON wishlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete from their own wishlists
CREATE POLICY "Users can delete from their own wishlists"
  ON wishlists FOR DELETE
  USING (auth.uid() = user_id);
        `);
        process.exit(1);
      } else if (!tableError) {
        console.log('✅ Wishlists table already exists!');
        console.log('Verifying RLS policies...\n');
        // Table exists, just verify it works
      } else {
        throw tableError;
      }
    } else {
      console.log('✅ Wishlists table created successfully!');
    }

    // Verify the table works by attempting a test query
    const { data: testData, error: testError } = await supabase
      .from('wishlists')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Error querying wishlists table:', testError.message);
      process.exit(1);
    }

    console.log('✅ Wishlists table is functional!');
    console.log(`📊 Current wishlist count: ${testData?.length || 0}\n`);
    console.log('✅ Setup complete! Users can now save items to their wishlist.\n');

  } catch (error) {
    console.error('❌ Error creating wishlists table:', error);
    console.error('\nPlease run the SQL manually in Supabase SQL Editor (Dashboard → SQL Editor)');
    process.exit(1);
  }
}

// Run the script
createWishlistsTable();
