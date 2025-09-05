import { supabase } from './supabase'
import { UpgradeSuggestion } from '@/types/auth'

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

export async function getUserGear(userId: string): Promise<UserGearItem[]> {
  const { data, error } = await supabase
    .from('user_gear')
    .select(`
      *,
      components (
        id,
        name,
        brand,
        category,
        price_new,
        price_used_min,
        price_used_max,
        budget_tier,
        sound_signature,
        use_cases,
        impedance,
        needs_amp,
        amazon_url,
        why_recommended,
        image_url
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user gear:', error)
    return []
  }

  return data as UserGearItem[]
}

export async function addGearItem(
  userId: string,
  gearData: Partial<UserGearItem>
): Promise<UserGearItem | null> {
  const { data, error } = await supabase
    .from('user_gear')
    .insert({
      ...gearData,
      user_id: userId,
      is_active: true,
      is_loaned: false
    })
    .select(`
      *,
      components (
        id,
        name,
        brand,
        category,
        price_new,
        price_used_min,
        price_used_max,
        budget_tier,
        sound_signature,
        use_cases,
        impedance,
        needs_amp,
        amazon_url,
        why_recommended,
        image_url
      )
    `)
    .single()

  if (error) {
    console.error('Error adding gear item:', error)
    if (error.code === 'PGRST205') {
      console.error('❌ The user_gear table does not exist. Please create it by running the SQL script in scripts/create-user-gear-table.sql in your Supabase dashboard.')
    }
    return null
  }

  return data as UserGearItem
}

export async function updateGearItem(
  userId: string,
  gearId: string,
  updates: Partial<UserGearItem>
): Promise<boolean> {
  const { error } = await supabase
    .from('user_gear')
    .update(updates)
    .eq('id', gearId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating gear item:', error)
    return false
  }

  return true
}

export async function removeGearItem(
  userId: string,
  gearId: string
): Promise<boolean> {
  // Soft delete by marking as inactive
  const { error } = await supabase
    .from('user_gear')
    .update({ is_active: false })
    .eq('id', gearId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error removing gear item:', error)
    return false
  }

  return true
}

export async function calculateCollectionValue(gear: UserGearItem[]): Promise<{
  totalPaid: number
  currentValue: number
  depreciation: number
  byCategory: Record<string, { paid: number; current: number }>
}> {
  let totalPaid = 0
  let currentValue = 0
  const byCategory: Record<string, { paid: number; current: number }> = {}

  for (const item of gear) {
    const paid = item.purchase_price || 0
    totalPaid += paid

    // Calculate current value based on used market prices
    let current = paid
    if (item.components) {
      const avgUsed = ((item.components.price_used_min || 0) + (item.components.price_used_max || 0)) / 2
      if (avgUsed > 0) {
        current = avgUsed
      } else if (item.components.price_new) {
        // Estimate 70% of new price if no used data
        current = item.components.price_new * 0.7
      }
    }
    currentValue += current

    // Category aggregation
    const category = item.components?.category || item.custom_category || 'other'
    if (!byCategory[category]) {
      byCategory[category] = { paid: 0, current: 0 }
    }
    byCategory[category].paid += paid
    byCategory[category].current += current
  }

  return {
    totalPaid,
    currentValue,
    depreciation: totalPaid - currentValue,
    byCategory
  }
}

interface GearSuggestion {
  type: string
  priority: string
  message: string
  items?: UserGearItem[]
}

export async function getUpgradeSuggestions(
  userId: string,
  budget?: number
): Promise<GearSuggestion[]> {
  // Get user's current gear
  const gear = await getUserGear(userId)
  
  // Analyze weak points and suggest upgrades
  const suggestions = []
  
  // Check if user needs an amp for high-impedance headphones
  const highImpedanceHeadphones = gear.filter(
    item => item.components?.impedance && item.components.impedance > 80
  )
  
  if (highImpedanceHeadphones.length > 0) {
    const hasAmp = gear.some(
      item => item.components?.category === 'amps' || item.components?.category === 'combo'
    )
    
    if (!hasAmp) {
      suggestions.push({
        type: 'missing_amp',
        priority: 'high',
        message: 'You have high-impedance headphones that would benefit from an amplifier',
        items: highImpedanceHeadphones
      })
    }
  }
  
  // Check if user needs a DAC
  const hasDAC = gear.some(
    item => item.components?.category === 'dacs' || item.components?.category === 'combo'
  )
  
  if (!hasDAC && gear.length > 0) {
    suggestions.push({
      type: 'missing_dac',
      priority: 'medium',
      message: 'Consider adding a DAC for better sound quality from digital sources',
    })
  }
  
  return suggestions
}

export async function getUniqueBrands(): Promise<string[]> {
  const { data, error } = await supabase
    .from('components')
    .select('brand')
    .not('brand', 'is', null)
    .order('brand')

  if (error) {
    console.error('Error fetching brands:', error)
    return []
  }

  // Return unique brands, sorted
  return [...new Set(data.map(item => item.brand))].sort()
}

export async function getProductsForBrand(brand: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('components')
    .select('name')
    .eq('brand', brand)
    .not('name', 'is', null)
    .order('name')

  if (error) {
    console.error('Error fetching products for brand:', error)
    return []
  }

  return data.map(item => item.name)
}

// Simple fuzzy matching to detect similar strings
export function findSimilarStrings(input: string, list: string[], threshold = 0.7): string[] {
  if (!input || input.length < 2) return []
  
  const inputLower = input.toLowerCase()
  const similar: string[] = []
  
  for (const item of list) {
    const itemLower = item.toLowerCase()
    
    // Skip exact matches
    if (itemLower === inputLower) continue
    
    // Simple similarity check: Levenshtein-like
    const similarity = calculateSimilarity(inputLower, itemLower)
    if (similarity >= threshold) {
      similar.push(item)
    }
  }
  
  return similar
}

function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  
  // Handle edge cases
  if (len1 === 0 || len2 === 0) return 0
  if (str1 === str2) return 1
  
  // Simple similarity based on common characters and length
  let matches = 0
  const minLen = Math.min(len1, len2)
  const maxLen = Math.max(len1, len2)
  
  // Count matching characters at similar positions (fuzzy)
  for (let i = 0; i < minLen; i++) {
    if (str1[i] === str2[i]) matches++
    else {
      // Check if character appears nearby
      for (let j = Math.max(0, i - 1); j <= Math.min(len2 - 1, i + 1); j++) {
        if (str1[i] === str2[j]) {
          matches += 0.5
          break
        }
      }
    }
  }
  
  return matches / maxLen
}