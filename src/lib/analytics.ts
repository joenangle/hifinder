// Analytics utilities for HiFinder
// Consistent budget segments with the rest of the application

import type { AnalyticsEvent } from '@/types/analytics'

export type { AnalyticsEvent } from '@/types/analytics'

export function trackEvent(event: AnalyticsEvent) {
  // Only track in production and if gtag is available
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
    const eventData = 'parameters' in event ? event.parameters : ('properties' in event ? event.properties : {})
    window.gtag('event', event.name, eventData || {})
  }
  
  // Also log in development for debugging
  if (process.env.NODE_ENV === 'development') {
    const eventData = 'parameters' in event ? event.parameters : ('properties' in event ? event.properties : {})
    console.log('[Analytics]', event.name, eventData || {})
  }
}

export function trackPageView(path: string, title?: string) {
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
    const config: Record<string, string> = { page_path: path }
    if (title) config.page_title = title

    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID!, config)
  }
}

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: Record<string, string | number | boolean | Record<string, string | number | boolean>>) => void
  }
}