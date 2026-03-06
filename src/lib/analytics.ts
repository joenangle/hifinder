// Analytics utilities for HiFinder
// Consistent budget segments with the rest of the application

import type { BudgetTier, AnalyticsEvent } from '@/types/analytics'

export type { BudgetTier, UserSegment, AnalyticsEvent } from '@/types/analytics'

// Convert budget amount to tier (consistent with existing codebase)
export function getBudgetTier(budget: number): BudgetTier {
  if (budget <= 100) return 'budget'
  if (budget <= 400) return 'entry' 
  if (budget <= 1000) return 'mid_range'
  if (budget <= 3000) return 'high_end'
  return 'summit_fi'
}

// Track analytics event
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

// Track page view
export function trackPageView(path: string, title?: string) {
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
    const config: Record<string, string> = { page_path: path }
    if (title) config.page_title = title
    
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID!, config)
  }
}

// Set user properties
export function setUserProperties(properties: {
  budget_tier?: BudgetTier
  experience_level?: string
  signup_date?: string
  total_gear_items?: number
}) {
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID!, {
      user_properties: properties
    })
  }
}

// Price range helpers for consistent analytics
export function getPriceRange(price: number): string {
  if (price <= 50) return '$0-50'
  if (price <= 100) return '$51-100'
  if (price <= 200) return '$101-200'
  if (price <= 500) return '$201-500'
  if (price <= 1000) return '$501-1000'
  if (price <= 2000) return '$1001-2000'
  return '$2000+'
}

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: Record<string, string | number | boolean | Record<string, string | number | boolean>>) => void
  }
}