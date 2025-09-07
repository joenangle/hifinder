'use client'

import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signIn, signOut } from 'next-auth/react'
import { User } from 'lucide-react'
import Image from 'next/image'

const publicNavItems = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/quick-start', label: 'Quick Start' },
]

const authNavItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/gear', label: 'My Gear' },
  { href: '/wishlist', label: 'Wishlist' },
  { href: '/alerts', label: 'Alerts' },
]

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const [mounted, setMounted] = useState(false)
  const [imageError, setImageError] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  
  const navItems = session ? authNavItems : publicNavItems

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!mounted || !isOpen) return null

  return createPortal(
    <div className="fixed inset-0 md:hidden" style={{ zIndex: 'var(--z-modal)' }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Menu Panel */}
      <div className="absolute inset-y-0 right-0 w-80 max-w-[80vw] bg-background-primary border-l border-border-default backdrop-blur-lg bg-opacity-95">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-border-subtle">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-text-primary">Menu</span>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 px-6 py-6">
            <nav className="space-y-2 mb-6">
              {navItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                      isActive
                        ? 'bg-accent-subtle text-accent-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* User Section - moved up here */}
            <div className="border-t border-border-subtle pt-4">
            {session ? (
              <div className="space-y-4">
                {/* User Info */}
                <div className="flex items-center gap-3 px-4 py-3 bg-surface-hover rounded-lg">
                  {session.user?.image && !imageError ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full"
                      onError={() => setImageError(true)}
                      priority
                    />
                  ) : (
                    <User className="w-8 h-8 text-text-secondary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm truncate">
                      {session.user?.name || 'User'}
                    </p>
                    <p className="text-xs text-text-tertiary truncate">
                      {session.user?.email}
                    </p>
                  </div>
                </div>

                {/* Sign Out */}
                <button
                  onClick={() => {
                    onClose()
                    signOut()
                  }}
                  className="w-full px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg text-left font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onClose()
                  signIn()
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-accent-primary to-accent-hover text-white rounded-lg font-medium transition-all hover:shadow-md"
              >
                <User className="w-4 h-4" />
                Sign In
              </button>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}