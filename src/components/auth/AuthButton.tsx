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
      className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-transparent hover:bg-surface-hover text-secondary hover:text-primary border border-subtle rounded font-medium text-sm cursor-pointer transition-[color,background-color,border-color] duration-200 relative min-h-[44px] whitespace-nowrap flex-shrink-0"
    >
      <User className="w-4 h-4" />
      <span>Sign In</span>
    </button>
  )
}