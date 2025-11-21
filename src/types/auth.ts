// import { User } from 'next-auth' // Unused - we use declare module instead

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

export interface WishlistItem {
  id: string
  user_id: string
  component_id: string
  created_at: string
  component?: {
    id: string
    name: string
    brand: string
    category: string
    price_new?: number
    price_used_min?: number
    price_used_max?: number
    image_url?: string
  }
}

export interface UserGear {
  id: string
  user_id: string
  component_id: string
  condition: 'excellent' | 'very_good' | 'good' | 'fair'
  purchase_price?: number
  purchase_date?: string
  notes?: string
  created_at: string
  component?: {
    id: string
    name: string
    brand: string
    category: string
  }
}

export interface AlertPreference {
  id: string
  user_id: string
  component_id?: string
  category?: string
  brand?: string
  max_price?: number
  alert_type: 'price_drop' | 'new_listing' | 'back_in_stock'
  is_active: boolean
  created_at: string
}

export interface PriceAlert {
  id: string
  user_id: string
  component_id?: string
  target_price: number
  alert_type: 'below' | 'exact' | 'range'
  price_range_min?: number
  price_range_max?: number
  condition_preference?: string[]
  marketplace_preference?: string[]
  custom_search_query?: string
  custom_brand?: string
  custom_model?: string
  is_active: boolean
  last_triggered_at?: string
  trigger_count: number
  created_at: string
  updated_at: string
  components?: {
    id: string
    name: string
    brand: string
    category: string
    image_url?: string
    price_new?: number
    price_used_min?: number
    price_used_max?: number
  }
}

export interface TriggeredAlert {
  alert: PriceAlert
  listing: {
    id: string
    title: string
    price: number
    condition: string
    url: string
  }
  matchType: 'brand' | 'component' | 'category'
  triggered_at: string
}

export interface UpgradeSuggestion {
  component: {
    id: string
    name: string
    brand: string
    category: string
    price_new?: number
  }
  reason: string
  priority: 'high' | 'medium' | 'low'
  estimatedImprovement?: string
}