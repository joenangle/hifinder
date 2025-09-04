'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { User, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export function AuthButton() {
  const { data: session, status } = useSession()
  const [showMenu, setShowMenu] = useState(false)

  if (status === 'loading') {
    return (
      <div className="w-8 h-8 rounded-full bg-surface-secondary animate-pulse" />
    )
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg font-medium transition-colors"
      >
        <User className="w-4 h-4" />
        Sign In
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-2 bg-surface-secondary hover:bg-surface-elevated rounded-lg transition-colors"
      >
        {session.user?.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || 'User'}
            className="w-6 h-6 rounded-full"
          />
        ) : (
          <User className="w-6 h-6 text-muted" />
        )}
        <span className="text-foreground font-medium hidden sm:block">
          {session.user?.name || 'User'}
        </span>
        <ChevronDown className="w-4 h-4 text-muted" />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-48 bg-surface-elevated border border-border rounded-lg shadow-lg z-20">
            <div className="p-2">
              <div className="px-3 py-2 border-b border-border">
                <p className="font-medium text-foreground">
                  {session.user?.name}
                </p>
                <p className="text-sm text-muted">
                  {session.user?.email}
                </p>
              </div>
              <div className="py-2">
                <a
                  href="/wishlist"
                  className="block px-3 py-2 text-sm text-foreground hover:bg-surface-secondary rounded transition-colors"
                >
                  My Wishlist
                </a>
                <a
                  href="/gear"
                  className="block px-3 py-2 text-sm text-foreground hover:bg-surface-secondary rounded transition-colors"
                >
                  My Gear
                </a>
                <a
                  href="/alerts"
                  className="block px-3 py-2 text-sm text-foreground hover:bg-surface-secondary rounded transition-colors"
                >
                  Price Alerts
                </a>
                <button
                  onClick={() => signOut()}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-surface-secondary rounded transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}