import { User } from 'next-auth'

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
    type: string
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
    type: string
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