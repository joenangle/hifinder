// Simple table creation using rpc call
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTable() {
  console.log('🗃️ Creating used_listings table...')
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS used_listings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        component_id UUID REFERENCES components(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        price INTEGER NOT NULL,
        condition TEXT CHECK (condition IN ('excellent', 'very_good', 'good', 'fair', 'parts_only')),
        location TEXT,
        source TEXT CHECK (source IN ('reddit_avexchange', 'ebay', 'head_fi', 'usaudiomart', 'manual')),
        url TEXT NOT NULL,
        date_posted TIMESTAMPTZ NOT NULL,
        seller_username TEXT NOT NULL,
        seller_confirmed_trades INTEGER,
        seller_feedback_score INTEGER,
        seller_feedback_percentage INTEGER,
        images TEXT[],
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        price_is_reasonable BOOLEAN DEFAULT true,
        price_variance_percentage DECIMAL,
        price_warning TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS used_listings_component_id_idx ON used_listings(component_id);
      CREATE INDEX IF NOT EXISTS used_listings_is_active_idx ON used_listings(is_active);
      CREATE INDEX IF NOT EXISTS used_listings_date_posted_idx ON used_listings(date_posted DESC);
    `
  })
  
  if (error) {
    console.error('❌ Table creation failed:', error)
    return false
  }
  
  console.log('✅ Table created successfully!')
  return true
}

if (require.main === module) {
  createTable()
}

module.exports = { createTable }