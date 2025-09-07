'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Logo } from './Logo'
import { DesktopNav } from './DesktopNav'
import { ThemeToggle } from './ThemeToggle'
import { AuthButton } from '../AuthButton'
import { UserMenu } from './UserMenu'
import { MobileMenuButton } from './MobileMenuButton'
import { MobileMenu } from './MobileMenu'

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { data: session } = useSession()

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    const handleRouteChange = () => {
      setIsMobileMenuOpen(false)
    }

    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [])

  return (
    <>
      <header
        className={`sticky top-0 w-full bg-background-primary/80 backdrop-blur-md transition-all duration-200 ${
          scrolled ? 'shadow-sm border-b border-border-subtle' : ''
        }`}
        style={{ zIndex: 'var(--z-header)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Logo />

            {/* Desktop Navigation */}
            <DesktopNav />

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <ThemeToggle />

              {/* Auth/User Actions */}
              {session ? <UserMenu /> : <AuthButton />}

              {/* Mobile Menu Button */}
              <MobileMenuButton
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </>
  )
}