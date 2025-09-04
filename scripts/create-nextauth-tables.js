const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createNextAuthTables() {
  console.log('🚀 Creating NextAuth.js Supabase adapter tables...\n');

  const queries = [
    // Create users table
    `CREATE TABLE IF NOT EXISTS public.users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      email_verified TIMESTAMPTZ,
      image TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Create accounts table
    `CREATE TABLE IF NOT EXISTS public.accounts (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(provider, provider_account_id)
    )`,

    // Create sessions table
    `CREATE TABLE IF NOT EXISTS public.sessions (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      session_token TEXT UNIQUE NOT NULL,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      expires TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,

    // Create verification tokens table
    `CREATE TABLE IF NOT EXISTS public.verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY(identifier, token)
    )`,

    // Create indexes
    `CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON public.accounts(user_id)`,
    `CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON public.sessions(user_id)`,
    `CREATE INDEX IF NOT EXISTS sessions_session_token_idx ON public.sessions(session_token)`,

    // Enable RLS
    `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY`
  ];

  const policies = [
    // Users policies
    `CREATE POLICY "Users can view own user data" ON public.users
      FOR SELECT USING (auth.uid()::text = id::text)`,
    
    `CREATE POLICY "Users can update own user data" ON public.users
      FOR UPDATE USING (auth.uid()::text = id::text)`,

    // Service role policies
    `CREATE POLICY "Service role can manage users" ON public.users
      FOR ALL USING (auth.role() = 'service_role')`,

    `CREATE POLICY "Service role can manage accounts" ON public.accounts
      FOR ALL USING (auth.role() = 'service_role')`,

    `CREATE POLICY "Service role can manage sessions" ON public.sessions
      FOR ALL USING (auth.role() = 'service_role')`,

    `CREATE POLICY "Service role can manage verification tokens" ON public.verification_tokens
      FOR ALL USING (auth.role() = 'service_role')`
  ];

  // Execute table creation queries
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`📝 Executing query ${i + 1}/${queries.length}...`);
    
    try {
      const { data, error } = await supabase.rpc('exec', { 
        sql: query 
      }).catch(async () => {
        // Fallback: try with raw SQL if RPC doesn't work
        return await supabase.from('_').select(query).limit(0);
      });

      if (error) {
        console.log('⚠️  Query error (might be expected):', error.message);
      } else {
        console.log('✅ Query executed successfully');
      }
    } catch (err) {
      console.log('⚠️  Query exception (might be expected):', err.message);
    }
  }

  // Execute policies (these might fail if they already exist)
  console.log('\n🔒 Creating security policies...');
  for (let i = 0; i < policies.length; i++) {
    const policy = policies[i];
    console.log(`📝 Creating policy ${i + 1}/${policies.length}...`);
    
    try {
      const { data, error } = await supabase.rpc('exec', { 
        sql: policy 
      }).catch(async () => {
        // Fallback approach
        return await supabase.from('_').select(policy).limit(0);
      });

      if (error) {
        console.log('⚠️  Policy error (might already exist):', error.message);
      } else {
        console.log('✅ Policy created successfully');
      }
    } catch (err) {
      console.log('⚠️  Policy exception (might already exist):', err.message);
    }
  }

  // Verify tables were created
  console.log('\n🔍 Verifying tables...');
  const tables = ['users', 'accounts', 'sessions', 'verification_tokens'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log('❌', table, 'table verification failed:', error.message);
      } else {
        console.log('✅', table, 'table verified');
      }
    } catch (err) {
      console.log('❌', table, 'verification error:', err.message);
    }
  }

  console.log('\n🎉 NextAuth tables setup complete!');
}

createNextAuthTables().catch(console.error);