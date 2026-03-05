'use client'

import { trackEvent, AnalyticsEvent } from '@/lib/analytics'
import { ReactNode } from 'react'

interface TrackableAnchorProps {
  href: string
  event: AnalyticsEvent
  className?: string
  style?: React.CSSProperties
  children: ReactNode
}

export function TrackableAnchor({ href, event, className, style, children }: TrackableAnchorProps) {
  return (
    <a
      href={href}
      className={className}
      style={style}
      onClick={() => trackEvent(event)}
    >
      {children}
    </a>
  )
}
