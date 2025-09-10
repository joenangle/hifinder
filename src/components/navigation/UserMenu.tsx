'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSession, signOut } from 'next-auth/react'
import { User, ChevronDown } from 'lucide-react'
import Image from 'next/image'

// User menu now only contains account-related actions
// Page navigation moved to hamburger menu

export function UserMenu() {
  const { data: session } = useSession()
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
          <User className="w-5 h-5 text-text-secondary" />
        )}
        <span className="text-sm font-medium text-text-primary hidden sm:block">
          {session.user?.name || 'User'}
        </span>
        <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {mounted && isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed w-56 bg-surface-elevated bg-opacity-95 backdrop-blur-lg border border-border-default rounded-lg shadow-lg"
          style={{ 
            zIndex: 'var(--z-modal)',
            top: buttonRef.current ? buttonRef.current.getBoundingClientRect().bottom + window.scrollY + 8 : 0,
            right: buttonRef.current ? window.innerWidth - buttonRef.current.getBoundingClientRect().right : 0
          }}
        >
          <div className="p-2">
            {/* User Info */}
            <div className="px-3 py-3 border-b border-border-subtle">
              <p className="font-medium text-text-primary text-sm">
                {session.user?.name}
              </p>
              <p className="text-xs text-text-tertiary">
                {session.user?.email}
              </p>
            </div>

            {/* Account Actions */}
            <div className="py-2">
              <button
                onClick={() => {
                  setIsOpen(false)
                  signOut()
                }}
                className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
              >
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