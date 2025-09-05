'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'

export function Analytics() {
  const pathname = usePathname()

  useEffect(() => {
    // Track initial page view
    trackPageView(pathname)
  }, [pathname])

  return null
}

// Track click events on buttons/links
export function TrackClick({ 
  eventName, 
  parameters = {}, 
  children, 
  className,
  onClick,
  ...props 
}: {
  eventName: string
  parameters?: Record<string, string | number | boolean>
  children: React.ReactNode
  className?: string
  onClick?: () => void
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  
  const handleClick = () => {
    // Track the event
    if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
      window.gtag('event', eventName, parameters)
    }
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', eventName, parameters)
    }
    
    // Call original onClick if provided
    if (onClick) {
      onClick()
    }
  }

  return (
    <button {...props} className={className} onClick={handleClick}>
      {children}
    </button>
  )
}

// Track link clicks
export function TrackLink({ 
  eventName, 
  parameters = {}, 
  children, 
  className,
  href,
  onClick,
  ...props 
}: {
  eventName: string
  parameters?: Record<string, string | number | boolean>
  children: React.ReactNode
  className?: string
  href: string
  onClick?: () => void
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  
  const handleClick = () => {
    // Track the event
    if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
      window.gtag('event', eventName, {
        link_url: href,
        ...parameters
      })
    }
    
    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', eventName, { link_url: href, ...parameters })
    }
    
    // Call original onClick if provided
    if (onClick) {
      onClick()
    }
  }

  return (
    <a {...props} className={className} href={href} onClick={handleClick}>
      {children}
    </a>
  )
}