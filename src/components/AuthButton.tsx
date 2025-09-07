'use client'

import { useSession, signIn } from 'next-auth/react'
import { User } from 'lucide-react'

export function AuthButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="w-8 h-8 rounded-full bg-surface-hover animate-pulse" />
    )
  }

  if (session) {
    return null // User menu handles authenticated state
  }

  return (
    <button
      onClick={() => signIn()}
      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-accent-primary to-accent-hover hover:from-accent-hover hover:to-accent-primary text-white rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent-primary/40 focus:ring-offset-2 active:scale-95 transform"
    >
      <User className="w-4 h-4" />
      Sign In
    </button>
  )
}