'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AuthButton } from './AuthButton'
import { ThemeToggle } from './ThemeToggle'
import { trackEvent } from '@/lib/analytics'

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle body scroll prevention
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isMobileMenuOpen])

  const isActivePage = (href: string) => {
    if (href === '/' && pathname === '/') return true
    if (href !== '/' && pathname.startsWith(href)) return true
    return false
  }

  const handleNavClick = (action: string) => {
    trackEvent({ name: 'nav_clicked', properties: { action } })
    setIsMobileMenuOpen(false)
  }

  const signedOutNavItems = [
    { href: '/quick-start', label: 'Quick Start' },
    { href: '/gear', label: 'My Gear' },
    { href: '/about', label: 'About' }
  ]

  const signedInNavItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/gear', label: 'My Gear' },
    { href: '/gear?tab=stacks', label: 'Build Stack' },
    { href: '/used-market', label: 'Market' }
  ]

  const navItems = session ? signedInNavItems : signedOutNavItems
  const firstName = session?.user?.name?.split(' ')[0] || 'User'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background-primary/95 backdrop-blur supports-[backdrop-filter]:bg-background-primary/60">
      <div className="flex h-14 items-center justify-between pl-12 pr-8 md:px-8 max-w-7xl mx-auto">
        {/* Logo/Home Button */}
        <Link 
          href="/" 
          className="flex items-center gap-2 hover:opacity-80 transition-opacity ml-2 md:ml-6"
          aria-label="HiFinder Home"
          onClick={() => handleNavClick('home')}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent-hover rounded-lg flex items-center justify-center shadow-md border border-accent/20">
            <span className="text-lg">🎧</span>
          </div>
          <span className="font-bold text-lg text-foreground">
            HiFinder
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6" role="navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors hover:text-accent ${
                isActivePage(item.href)
                  ? 'text-accent border-b-2 border-accent pb-1'
                  : 'text-muted-foreground'
              }`}
              onClick={() => handleNavClick(item.label.toLowerCase().replace(' ', '_'))}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* User Menu (signed in, desktop) */}
          {session && (
            <div className="hidden md:block relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-2 hover:bg-surface rounded-lg transition-colors"
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center text-sm font-medium">
                  {firstName[0].toUpperCase()}
                </div>
                <span className="text-sm hidden lg:block">{firstName}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface-card border border-border rounded-lg shadow-xl py-2 z-50">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm hover:bg-surface transition-colors"
                    onClick={() => {
                      handleNavClick('profile')
                      setIsUserMenuOpen(false)
                    }}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm hover:bg-surface transition-colors"
                    onClick={() => {
                      handleNavClick('settings')
                      setIsUserMenuOpen(false)
                    }}
                  >
                    Settings
                  </Link>
                  <Link
                    href="/wishlist"
                    className="block px-4 py-2 text-sm hover:bg-surface transition-colors"
                    onClick={() => {
                      handleNavClick('wishlist')
                      setIsUserMenuOpen(false)
                    }}
                  >
                    Wishlist
                  </Link>
                  <hr className="border-border my-2" />
                  <div className="px-4 py-2">
                    <AuthButton />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auth Button (signed out, desktop) */}
          {!session && (
            <div className="hidden md:block">
              <AuthButton />
            </div>
          )}

          <ThemeToggle />

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-surface rounded-lg transition-colors relative z-50"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle menu"
          >
            <svg
              className="w-5 h-5 transition-transform ease-in-out"
              style={{ transitionDuration: 'var(--menu-transition-duration)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mounted && (
        <div 
          className={`fixed inset-0 z-40 transition-all duration-300 ease-in-out ${
            isMobileMenuOpen ? 'visible' : 'invisible'
          }`}
          style={{ zIndex: 'var(--z-modal)' }}
          aria-hidden={!isMobileMenuOpen}
          role="navigation"
          aria-label="Mobile navigation menu"
        >
          {/* Backdrop */}
          <div 
            className={`absolute inset-0 backdrop-blur-md transition-opacity duration-300 ease-in-out ${
              isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ 
              backgroundColor: `var(--background-secondary)`,
              opacity: isMobileMenuOpen ? 'var(--menu-backdrop-opacity)' : 0
            }}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          />
          
          {/* Menu Panel */}
          <div 
            className={`absolute right-0 h-screen h-dvh w-full sm:w-80 shadow-2xl transform transition-transform ease-in-out ${
              isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ 
              backgroundColor: `var(--background-primary)`,
              opacity: 'var(--menu-panel-opacity)',
              backdropFilter: 'blur(var(--menu-blur-amount))',
              transitionDuration: 'var(--menu-transition-duration)'
            }}
          >
            <div className="flex flex-col h-full">
              {/* User Section (Signed In Only) */}
              {session && (
                <div className="p-6 border-b border-border bg-surface/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center text-lg font-medium">
                      {firstName[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{firstName}</div>
                      <div className="text-sm text-secondary">{session.user?.email}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Links */}
              <nav className="flex-1 p-6 space-y-2 overflow-y-auto" role="navigation">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-4 py-3 text-lg font-medium rounded-lg transition-all duration-200 ${
                      isActivePage(item.href)
                        ? 'text-accent bg-accent/15 border border-accent/30'
                        : 'text-foreground hover:bg-accent/10 hover:text-accent'
                    }`}
                    onClick={() => handleNavClick(item.label.toLowerCase().replace(' ', '_'))}
                  >
                    {item.label}
                  </Link>
                ))}
                
                {/* User Profile Links (Signed In Only) */}
                {session && (
                  <>
                    <div className="border-t border-border my-6" />
                    <Link
                      href="/profile"
                      className="block px-4 py-3 text-base font-medium text-foreground hover:bg-accent/10 hover:text-accent rounded-lg transition-all duration-200"
                      onClick={() => handleNavClick('profile')}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-3 text-base font-medium text-foreground hover:bg-accent/10 hover:text-accent rounded-lg transition-all duration-200"
                      onClick={() => handleNavClick('settings')}
                    >
                      Settings
                    </Link>
                    <Link
                      href="/wishlist"
                      className="block px-4 py-3 text-base font-medium text-foreground hover:bg-accent/10 hover:text-accent rounded-lg transition-all duration-200"
                      onClick={() => handleNavClick('wishlist')}
                    >
                      Wishlist
                    </Link>
                  </>
                )}
              </nav>

              {/* Auth Section */}
              <div className="p-6 border-t border-border bg-surface/5">
                <AuthButton />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close desktop user menu */}
      {isUserMenuOpen && !isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </header>
  )
}