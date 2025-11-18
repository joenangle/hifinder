'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

const publicNavItems = [
  { href: '/', label: 'Home' },
  { href: '/recommendations?budget=250', label: 'Recommendations' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/about', label: 'About' },
  { href: '/learn', label: 'Learn' },
]

const authNavItems = [
  { href: '/', label: 'Home' },
  { href: '/dashboard-new', label: 'Dashboard' },
  { href: '/recommendations?budget=250', label: 'Recommendations' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/gear', label: 'My Gear' },
  { href: '/about', label: 'About' },
  { href: '/learn', label: 'Learn' },
]

export function DesktopNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  
  const navItems = session ? authNavItems : publicNavItems

  return (
    <nav className="hidden lg:flex items-center gap-8">
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