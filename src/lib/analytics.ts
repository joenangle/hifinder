// Analytics utilities for HiFinder
// Consistent budget segments with the rest of the application

export type BudgetTier = 'budget' | 'entry' | 'mid_range' | 'high_end' | 'summit_fi'

export type UserSegment = {
  budget_tier: BudgetTier
  experience_level: 'beginner' | 'intermediate' | 'advanced'
  primary_category: 'headphones' | 'iems' | 'dac' | 'amp' | 'combo'
}

// Convert budget amount to tier (consistent with existing codebase)
export function getBudgetTier(budget: number): BudgetTier {
  if (budget <= 100) return 'budget'
  if (budget <= 400) return 'entry' 
  if (budget <= 1000) return 'mid_range'
  if (budget <= 3000) return 'high_end'
  return 'summit_fi'
}

// Analytics event types
export type AnalyticsEvent = 
  // Onboarding
  | { name: 'onboarding_started' }
  | { name: 'onboarding_step_completed', parameters: { step_number: number } }
  | { name: 'onboarding_abandoned', parameters: { step_number: number } }
  | { name: 'onboarding_completed', parameters: { budget_tier: BudgetTier, experience_level: string } }
  
  // Recommendations
  | { name: 'recommendations_generated', parameters: { budget_tier: BudgetTier, category: string, items_count: number } }
  | { name: 'recommendation_clicked', parameters: { component_id: string, category: string, price: number, budget_tier: BudgetTier } }
  | { name: 'recommendation_saved_to_gear', parameters: { component_id: string, category: string } }
  
  // Gear Management
  | { name: 'gear_item_added', parameters: { category: string, method: 'recommendation' | 'manual', price?: number } }
  | { name: 'gear_item_removed', parameters: { category: string } }
  | { name: 'stack_created', parameters: { components_count: number, total_value: number, budget_tier: BudgetTier } }
  
  // Used Market
  | { name: 'used_listing_clicked', parameters: { source: 'reddit' | 'headfi' | 'avexchange', price_range: string, category: string } }
  | { name: 'price_alert_created', parameters: { component_id?: string, target_price: number, budget_tier: BudgetTier } }
  | { name: 'alert_triggered_clicked', parameters: { listing_price: number, target_price: number } }

// Track analytics event
export function trackEvent(event: AnalyticsEvent) {
  // Only track in production and if gtag is available
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
    window.gtag('event', event.name, event.parameters || {})
  }
  
  // Also log in development for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', event.name, event.parameters || {})
  }
}

// Track page view
export function trackPageView(path: string, title?: string) {
  if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID!, {
      page_path: path,
      page_title: title,
    })
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
    gtag: (command: string, targetId: string, config?: any) => void
  }
}