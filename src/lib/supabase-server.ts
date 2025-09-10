import { createClient } from '@supabase/supabase-js'

// Server-side client that works with service role key
// This should ONLY be used in API routes or server components
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for server operations')
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// This client bypasses RLS and should only be used in server environments
// where user authorization is already handled by NextAuth sessions