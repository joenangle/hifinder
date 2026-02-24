'use client'

import Link from 'next/link'
import { trackEvent, AnalyticsEvent } from '@/lib/analytics'
import { ReactNode } from 'react'

interface TrackableLinkProps {
  href: string
  event: AnalyticsEvent
  className?: string
  style?: React.CSSProperties
  children: ReactNode
}

export function TrackableLink({ href, event, className, style, children }: TrackableLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      style={style}
      onClick={() => trackEvent(event)}
    >
      {children}
    </Link>
  )
}
