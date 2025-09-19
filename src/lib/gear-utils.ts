import { UserGearItem } from '@/lib/gear'
import { Headphones, Cpu, Speaker, Cable } from 'lucide-react'

export type CategoryFilter = 'all' | 'headphones' | 'iems' | 'dacs' | 'amps' | 'combo'

// Helper function to get the category of a gear item
export function getGearCategory(item: UserGearItem): CategoryFilter {
  // Check custom category first (for manually added items)
  if (item.custom_category) {
    // Map old dac_amp to combo
    const category = item.custom_category === 'dac_amp' ? 'combo' : item.custom_category
    // Ensure it's a valid CategoryFilter, default to 'headphones' if not
    return ['headphones', 'iems', 'dacs', 'amps', 'combo'].includes(category)
      ? category as CategoryFilter
      : 'headphones'
  }
  // Fall back to components category (for database items)
  const category = item.components?.category || 'headphones'
  // Map old dac_amp to combo
  const mappedCategory = category === 'dac_amp' ? 'combo' : category
  // Ensure it's a valid CategoryFilter, default to 'headphones' if not
  return ['headphones', 'iems', 'dacs', 'amps', 'combo'].includes(mappedCategory)
    ? mappedCategory as CategoryFilter
    : 'headphones'
}

// Helper function to calculate current value of gear item
export function calculateCurrentValue(item: UserGearItem): number {
  if (item.components?.price_used_min && item.components?.price_used_max) {
    return (item.components.price_used_min + item.components.price_used_max) / 2
  }
  if (item.components?.price_new) {
    return item.components.price_new * 0.7 // 70% of new price
  }
  return item.purchase_price || 0
}

// Helper function to get the category icon
export function getCategoryIcon(category: string) {
  switch (category) {
    case 'headphones':
    case 'iems':
      return <Headphones className="w-5 h-5" />
    case 'dacs':
      return <Cpu className="w-5 h-5" />
    case 'amps':
    case 'combo':
      return <Speaker className="w-5 h-5" />
    default:
      return <Cable className="w-5 h-5" />
  }
}