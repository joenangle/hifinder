import { createClient } from '@supabase/supabase-js'

// Admin client with service role key for server-side operations
// This bypasses RLS and should only be used in API routes and server components
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// This client should ONLY be used on the server side
// If this is being imported on the client, use the regular supabase client instead
export const supabaseAdmin = typeof window === 'undefined' 
  ? createClient(supabaseUrl, supabaseServiceRoleKey || '', {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : ({} as ReturnType<typeof createClient>) // This should never be used on client side

// This client should only be used in:
// 1. API routes (src/app/api/*)
// 2. Server-side functions
// 3. Scripts
// 
// NEVER use this in client components or expose the service role key to the frontend