'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSession, signOut } from 'next-auth/react'
import { User, ChevronDown, LayoutDashboard, Package, Heart, Bell, LogOut } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function UserMenu() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  if (!session) {
    return null
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-hover hover:bg-surface-elevated transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {session.user?.image && !imageError ? (
          <Image
            src={session.user.image}
            alt={session.user.name || 'User'}
            width={24}
            height={24}
            className="w-6 h-6 rounded-full"
            onError={() => setImageError(true)}
            priority
          />
        ) : (
          <User className="w-5 h-5 text-secondary" />
        )}
        <span className="text-sm font-medium text-primary hidden sm:block">
          {session.user?.name || 'User'}
        </span>
        <ChevronDown className={`w-4 h-4 text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {mounted && isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed w-56 bg-surface-elevated bg-opacity-95 backdrop-blur-lg border rounded-lg shadow-lg"
          style={{ 
            zIndex: 'var(--z-modal)',
            top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + 8 : 0,
            right: buttonRef.current ? window.innerWidth - buttonRef.current.getBoundingClientRect().right : 0
          }}
        >
          <div className="p-2">
            {/* User Info */}
            <div className="px-3 py-3 border-b border-subtle">
              <p className="font-medium text-primary text-sm">
                {session.user?.name}
              </p>
              <p className="text-xs text-tertiary">
                {session.user?.email}
              </p>
            </div>

            {/* Navigation Links */}
            <div className="py-2">
              <Link
                href="/dashboard"
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 w-full text-left px-3 py-3 text-sm rounded transition-colors ${
                  pathname === '/dashboard'
                    ? 'text-primary bg-surface-hover'
                    : 'text-secondary hover:text-primary hover:bg-surface-hover'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                href="/gear"
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 w-full text-left px-3 py-3 text-sm rounded transition-colors ${
                  pathname === '/gear'
                    ? 'text-primary bg-surface-hover'
                    : 'text-secondary hover:text-primary hover:bg-surface-hover'
                }`}
              >
                <Package className="w-4 h-4" />
                My Gear
              </Link>
              <Link
                href="/wishlist"
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 w-full text-left px-3 py-3 text-sm rounded transition-colors ${
                  pathname === '/wishlist'
                    ? 'text-primary bg-surface-hover'
                    : 'text-secondary hover:text-primary hover:bg-surface-hover'
                }`}
              >
                <Heart className="w-4 h-4" />
                Wishlist
              </Link>
              <Link
                href="/alerts"
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 w-full text-left px-3 py-3 text-sm rounded transition-colors ${
                  pathname === '/alerts'
                    ? 'text-primary bg-surface-hover'
                    : 'text-secondary hover:text-primary hover:bg-surface-hover'
                }`}
              >
                <Bell className="w-4 h-4" />
                Price Alerts
              </Link>
            </div>

            {/* Divider */}
            <div className="border-t border-subtle my-2" />

            {/* Account Actions */}
            <div className="py-2">
              <button
                onClick={() => {
                  setIsOpen(false)
                  signOut()
                }}
                className="flex items-center gap-3 w-full text-left px-3 py-3 text-sm text-secondary hover:text-primary hover:bg-surface-hover rounded transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}