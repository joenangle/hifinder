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

// Map raw category strings to human-readable labels
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'cans': 'Headphones',
    'headphones': 'Headphones',
    'iems': 'IEMs',
    'dac': 'DAC',
    'dacs': 'DAC',
    'amp': 'Amplifier',
    'amps': 'Amplifier',
    'dac_amp': 'DAC/Amp Combo',
    'combo': 'DAC/Amp Combo',
    'cable': 'Cable',
  }
  return labels[category?.toLowerCase()] || category || 'Unknown'
}

// Get Tailwind color classes for a category
export function getCategoryColor(category: string): { bg: string; text: string } {
  const normalized = category?.toLowerCase()
  switch (normalized) {
    case 'headphones':
    case 'cans':
      return { bg: 'bg-violet-500/15', text: 'text-violet-600 dark:text-violet-400' }
    case 'iems':
      return { bg: 'bg-indigo-500/15', text: 'text-indigo-600 dark:text-indigo-400' }
    case 'dac':
    case 'dacs':
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400' }
    case 'amp':
    case 'amps':
      return { bg: 'bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400' }
    case 'dac_amp':
    case 'combo':
      return { bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400' }
    default:
      return { bg: 'bg-gray-500/15', text: 'text-gray-600 dark:text-gray-400' }
  }
}

// Get emoji for a category
export function getCategoryEmoji(category: string): string {
  const normalized = category?.toLowerCase()
  switch (normalized) {
    case 'headphones':
    case 'cans':
      return '🎧'
    case 'iems':
      return '👂'
    case 'dac':
    case 'dacs':
      return '🔊'
    case 'amp':
    case 'amps':
      return '⚡'
    case 'dac_amp':
    case 'combo':
      return '🔗'
    case 'cable':
      return '🔌'
    default:
      return '📦'
  }
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