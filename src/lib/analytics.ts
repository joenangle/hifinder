// Analytics utilities for HiFinder
// Consistent budget segments with the rest of the application

export type BudgetTier = 'budget' | 'entry' | 'mid_range' | 'high_end' | 'summit_fi'

export type UserSegment = {
  budget_tier: BudgetTier
  experience_level: 'beginner' | 'intermediate' | 'enthusiast'
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
  // Homepage/Navigation
  | { name: 'hero_cta_clicked', properties?: { location?: string } }
  | { name: 'learn_clicked', properties?: { location?: string } }
  | { name: 'how_it_works_clicked', properties?: { location?: string } }
  | { name: 'feature_clicked', properties?: { feature?: string } }
  | { name: 'cta_clicked', properties?: { location?: string } }
  | { name: 'education_clicked', properties?: { location?: string } }
  | { name: 'budget_quick_start_clicked', properties?: { budget_tier?: string, budget_amount?: number } }
  | { name: 'final_cta_clicked', properties?: { location?: string } }
  
  // Dashboard
  | { name: 'dashboard_action_clicked', properties?: { action?: string } }
  | { name: 'dashboard_link_clicked', properties?: { link?: string } }
  | { name: 'dashboard_budget_clicked', properties?: { budget?: number } }
  
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
  | { name: 'stack_ebay_search_clicked', properties: { component_count: number, total_cost: number } }

  // Used Market
  | { name: 'used_listing_clicked', parameters: { source: 'reddit' | 'headfi' | 'avexchange', price_range: string, category: string } }
  | { name: 'price_alert_created', parameters: { component_id?: string, target_price: number, budget_tier: BudgetTier } }
  | { name: 'alert_triggered_clicked', parameters: { listing_price: number, target_price: number } }

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