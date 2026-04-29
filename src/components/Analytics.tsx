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