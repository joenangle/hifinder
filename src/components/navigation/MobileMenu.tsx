'use client'

import { createPortal } from 'react-dom'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signIn } from 'next-auth/react'

const publicNavItems = [
  { href: '/', label: 'Home' },
  { href: '/recommendations', label: 'Recommendations' },
  { href: '/about', label: 'About' },
  { href: '/learn', label: 'Learn' },
]

const authNavItems = [
  { href: '/', label: 'Home' },
  { href: '/recommendations', label: 'Recommendations' },
  { href: '/gear', label: 'My Gear' },
  { href: '/wishlist', label: 'Wishlists' },
  { href: '/alerts', label: 'Alerts' },
  { href: '/about', label: 'About' },
  { href: '/learn', label: 'Learn' },
]

interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  buttonRef: React.RefObject<HTMLButtonElement | null>
}

export function MobileMenu({ isOpen, onClose, buttonRef }: MobileMenuProps) {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const menuRef = useRef<HTMLDivElement>(null)
  
  const navItems = session ? authNavItems : publicNavItems

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
        onClose()
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
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
  }, [isOpen, onClose, buttonRef])

  if (!mounted || !isOpen) return null

  return createPortal(
    <div
      ref={menuRef}
      className="fixed w-56 bg-surface-elevated bg-opacity-95 backdrop-blur-lg border border-border-default rounded-lg shadow-lg md:hidden"
      style={{ 
        zIndex: 'var(--z-modal)',
        top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : 0,
        right: buttonRef.current ? window.innerWidth - buttonRef.current.getBoundingClientRect().right : 0
      }}
    >
      <div className="p-2">
        {/* Navigation Items */}
        <div className="py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`block px-3 py-2 text-sm rounded transition-colors ${
                  isActive
                    ? 'text-accent-primary bg-surface-hover'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        {/* Auth Section */}
        {!session && (
          <div className="py-2 border-t border-border-subtle">
            <button
              onClick={() => {
                onClose()
                signIn()
              }}
              className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
            >
              Sign In
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}