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
      className="button button-primary flex items-center gap-2"
    >
      <User className="w-4 h-4" />
      Sign In
    </button>
  )
}