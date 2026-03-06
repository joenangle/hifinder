/**
 * Analytics domain types
 *
 * Types related to analytics events, budget tiers, and saved searches.
 * Extracted from lib/analytics.ts, lib/saved-searches.ts
 */

export type BudgetTier = 'budget' | 'entry' | 'mid_range' | 'high_end' | 'summit_fi'

export type UserSegment = {
  budget_tier: BudgetTier
  experience_level: 'beginner' | 'intermediate' | 'enthusiast'
  primary_category: 'headphones' | 'iems' | 'dac' | 'amp' | 'combo'
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
  | { name: 'email_subscribed', properties?: { source?: string } }
  | { name: 'help_mailto_clicked', properties?: { location?: string } }
  | { name: 'curated_system_clicked', properties?: { system_name?: string, budget_tier?: number, category?: string } }

  // Dashboard
  | { name: 'dashboard_action_clicked', properties?: { action?: string } }
  | { name: 'dashboard_link_clicked', properties?: { link?: string } }
  | { name: 'dashboard_budget_clicked', properties?: { budget?: number } }

  // Recommendations
  | { name: 'recommendations_generated', parameters: { budget_tier: BudgetTier, category: string, items_count: number } }
  | { name: 'recommendation_clicked', parameters: { component_id: string, category: string, price: number, budget_tier: BudgetTier } }
  | { name: 'recommendation_saved_to_gear', parameters: { component_id: string, category: string } }

  // Gear Management
  | { name: 'gear_item_added', parameters: { category: string, method: 'recommendation' | 'manual', price?: number } }
  | { name: 'gear_item_removed', parameters: { category: string } }
  | { name: 'stack_created', parameters: { components_count: number, total_value: number, budget_tier: BudgetTier } }
  | { name: 'stack_ebay_search_clicked', properties: { component_count: number, total_cost: number } }
  | { name: 'stack_saved_from_recommendations', properties: { component_count: number, total_cost: number, stack_name: string } }

  // Used Market
  | { name: 'used_listing_clicked', parameters: { source: 'reddit' | 'headfi' | 'avexchange', price_range: string, category: string } }
  | { name: 'price_alert_created', parameters: { component_id?: string, target_price: number, budget_tier: BudgetTier } }
  | { name: 'alert_triggered_clicked', parameters: { listing_price: number, target_price: number } }

export interface SavedSearch {
  url: string
  budget: number
  filters: string  // human-readable summary
  timestamp: number
}
