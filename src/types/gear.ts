/**
 * Gear domain types
 *
 * Types related to user gear, stacks, and gear utilities.
 * Extracted from lib/gear.ts, lib/stacks.ts, lib/gear-utils.tsx
 */

import type { Component } from '@/types'

export interface UserGearItem {
  id: string
  user_id: string
  component_id?: string
  purchase_date?: string
  purchase_price?: number
  purchase_location?: string
  condition?: 'new' | 'used' | 'refurbished' | 'b-stock'
  custom_name?: string
  custom_brand?: string
  custom_category?: string
  serial_number?: string
  is_active: boolean
  is_loaned: boolean
  loaned_to?: string
  loaned_date?: string
  notes?: string
  created_at: string
  updated_at: string
  components?: {
    id: string
    name: string
    brand: string
    category: string
    price_new?: number
    price_used_min?: number
    price_used_max?: number
    budget_tier?: string
    sound_signature?: string
    use_cases?: string[]
    impedance?: number
    needs_amp?: boolean
    amazon_url?: string
    why_recommended?: string
    image_url?: string
  }
}

export interface GearSuggestion {
  type: 'missing_amp' | 'missing_dac' | 'tier_upgrade' | 'bottleneck'
  priority: 'high' | 'medium' | 'low'
  message: string
  currentItem?: { brand: string; name: string; price: number | null; category: string }
  suggestedItems?: { id: string; brand: string; name: string; category: string; price_new: number | null; price_used_min: number | null; price_used_max: number | null }[]
}

export type StackPurpose = 'desktop' | 'portable' | 'studio' | 'gaming' | 'office' | 'general'

export interface UserStack {
  id: string
  user_id: string
  name: string
  description?: string
  purpose?: StackPurpose
  is_primary?: boolean
  created_at: string
  updated_at: string
  stack_components?: StackComponent[]
}

export interface StackComponent {
  id: string
  stack_id: string
  user_gear_id: string | null
  component_id?: string | null
  position: number
  created_at: string
  user_gear?: UserGearItem | null
  components?: Partial<Component> | null  // Direct component reference (recommendation stacks)
}

// Normalized data from either user_gear->components or direct components path
export interface StackComponentData {
  id: string
  brand: string
  name: string
  category: string
  price_new: number | null
  price_used_min: number | null
  price_used_max: number | null
  sound_signature: string | null
  impedance: number | null
  needs_amp: boolean
  amplification_difficulty?: string | null
  purchase_price: number | null
  image_url: string | null
  amazon_url: string | null
  // Expert data
  crin_tone: string | null
  crin_tech: string | null
  crin_rank: number | null
  crin_value: number | null
  crin_signature: string | null
  asr_sinad: number | null
  fr_data?: Record<string, unknown> | null
  driver_type: string | null
  fit: string | null
  why_recommended: string
  // Source tracking
  source: 'gear' | 'recommendation'
  // Original references for deletion
  user_gear_id: string | null
  component_id: string | null
  stack_component_id: string
}

export interface CompatibilityWarning {
  type: 'impedance' | 'power' | 'category' | 'connectivity'
  severity: 'warning' | 'error'
  message: string
  components: string[]
}

export interface StackTemplate {
  id: string
  name: string
  description: string
  budgetRange: { min: number; max: number }
  categories: string[]
  icon: string
}

export type CategoryFilter = 'all' | 'headphones' | 'iems' | 'dacs' | 'amps' | 'combo'
