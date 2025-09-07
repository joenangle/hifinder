'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

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

export function DesktopNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  
  const navItems = session ? authNavItems : publicNavItems

  return (
    <nav className="hidden md:flex items-center gap-8">
      {navItems.map((item) => {
        const isActive = pathname === item.href || 
          (item.href !== '/' && pathname.startsWith(item.href))
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium transition-colors relative py-2 px-1 ${
              isActive
                ? 'text-accent-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {item.label}
            {isActive && (
              <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-accent-primary rounded-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}