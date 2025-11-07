import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'

// Dynamic URL detection for deployments (reserved for future use)
// function getBaseUrl() {
//   if (process.env.NEXTAUTH_URL) {
//     return process.env.NEXTAUTH_URL
//   }

//   if (process.env.VERCEL_URL) {
//     return `https://${process.env.VERCEL_URL}`
//   }

//   // Fallback for local development
//   return process.env.NODE_ENV === 'production'
//     ? 'https://hifinder.app'
//     : 'http://localhost:3002'
// }

// Initialize Supabase client for data operations (not for adapter)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey)

export const authOptions: NextAuthOptions = {
  // Use JWT sessions for now (more stable than database adapter)
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // OAuth providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
          // Note: Do NOT set redirect_uri explicitly
          // NextAuth automatically handles the redirect URI
          // Setting it manually can cause OAuth errors on different environments
        }
      }
    }),
  ],
  
  // Callbacks
  callbacks: {
    async signIn({ user, account, profile: _profile }) { // profile unused
      if (account?.provider === 'google') {
        // PERFORMANCE FIX: Move user DB operations to background
        // Don't block the authentication flow with DB queries
        setImmediate(async () => {
          try {
            console.time('Auth-DB-Operation')

            // Use upsert for atomic operation (faster than select + insert/update)
            const { error } = await supabaseAuth
              .from('users')
              .upsert({
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                provider: account.provider,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'email',
                ignoreDuplicates: false
              })

            console.timeEnd('Auth-DB-Operation')

            if (error) {
              console.error('Background user upsert error:', error)
            }
          } catch (error) {
            console.error('Error in background user sync:', error)
          }
        })
      }
      return true
    },
    
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        token.accessToken = account.access_token
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      return token
    },
    
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
      }
      return session
    },
    
    async redirect({ url, baseUrl }) {
      // Redirect to homepage after sign in
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  
  // Use NextAuth's default pages for now
  
  // Security
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',
  
  // Debug mode in development
  debug: process.env.NODE_ENV === 'development',
}