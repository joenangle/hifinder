/**
 * Marketplace domain types
 *
 * Types related to price alerts, bundle listings, location normalization,
 * retailer links, and eBay affiliate integration.
 * Extracted from lib/alerts.ts, lib/parse-bundle-listings.ts,
 * lib/location-normalizer.ts, lib/retailer-links.ts, lib/ebay-affiliate.ts
 */

export interface PriceAlert {
  id: string
  user_id: string
  component_id?: string
  target_price: number
  alert_type: 'below' | 'exact' | 'range'
  price_range_min?: number
  price_range_max?: number
  condition_preference: string[]
  marketplace_preference: string[]
  custom_search_query?: string
  custom_brand?: string
  custom_model?: string
  is_active: boolean
  last_triggered_at?: string
  trigger_count: number
  created_at: string
  updated_at: string
  notification_frequency?: 'instant' | 'digest' | 'none'
  email_enabled?: boolean
  components?: {
    id: string
    name: string
    brand: string
    category: string
    type?: string
    image_url?: string
    price_new?: number
    price_used_min?: number
    price_used_max?: number
  }
}

export interface AlertHistory {
  id: string
  alert_id: string
  user_id: string
  listing_title: string
  listing_price: number
  listing_condition: string
  listing_url: string
  listing_source: string
  listing_date: string
  triggered_at: string
  notification_sent: boolean
  user_viewed: boolean
}

export interface BundleItem {
  type: 'component' | 'accessory' | 'unknown';
  name: string;
  isMainItem: boolean;
}

export interface BundleAnalysis {
  isBundle: boolean;
  items: BundleItem[];
  mainItems: BundleItem[];
  accessories: BundleItem[];
  bundleIndicators: string[];
  confidence: number; // 0-100
}

export interface RetailerLink {
  name: string
  url: string
  type: 'new' | 'used' | 'both'
}

export interface ComponentInfo {
  id: string
  brand: string
  name: string
  category: 'cans' | 'iems' | 'dac' | 'amp' | 'dac_amp' | 'cable'
  amazon_url: string | null
}

export interface ComponentSearchParams {
  brand: string;
  name: string;
  category?: 'cans' | 'iems' | 'dac' | 'amp' | 'dac_amp' | 'cable';
}

export interface EbayAffiliateConfig {
  campaignId?: string;
  customId?: string; // Optional tracking parameter
}
