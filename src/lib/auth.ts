import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'

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
        }
      }
    }),
  ],
  
  // Callbacks
  callbacks: {
    async signIn({ user, account, profile: _profile }) { // profile unused
      if (account?.provider === 'google') {
        try {
          // Store user in our own users table
          const { data: existingUser, error: fetchError } = await supabaseAuth
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single()
          
          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching user:', fetchError)
            return false
          }
          
          if (!existingUser) {
            // Create new user
            const { error: insertError } = await supabaseAuth
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                provider: account.provider,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
            
            if (insertError) {
              console.error('Error creating user:', insertError)
              // Continue anyway - user can still use the app
            }
          } else {
            // Update existing user
            const { error: updateError } = await supabaseAuth
              .from('users')
              .update({
                name: user.name,
                image: user.image,
                updated_at: new Date().toISOString(),
              })
              .eq('email', user.email)
            
            if (updateError) {
              console.error('Error updating user:', updateError)
            }
          }
        } catch (error) {
          console.error('Error in signIn callback:', error)
        }
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