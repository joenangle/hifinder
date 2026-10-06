import { needsAmplification } from './audio-calculations'
import { HEADPHONE_CATEGORIES, AMP_CATEGORIES, isCategoryIn } from './component-categories'
import type { UserStack, StackComponent, StackComponentData, StackPurpose, CompatibilityWarning, StackTemplate } from '@/types/gear'

export type { UserStack, StackComponent, StackComponentData, StackPurpose, CompatibilityWarning, StackTemplate } from '@/types/gear'

export interface StackWithGear extends UserStack {
  stack_components: StackComponent[]
}

// Normalize stack component data from either path
export function getStackComponentData(sc: StackComponent): StackComponentData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comp = (sc.user_gear?.components || sc.components) as Record<string, any> | undefined
  return {
    id: comp?.id || '',
    brand: sc.user_gear?.custom_brand || comp?.brand || 'Unknown',
    name: sc.user_gear?.custom_name || comp?.name || 'Unknown',
    category: sc.user_gear?.custom_category || comp?.category || '',
    price_new: comp?.price_new || null,
    price_used_min: comp?.price_used_min || null,
    price_used_max: comp?.price_used_max || null,
    sound_signature: comp?.sound_signature || null,
    impedance: comp?.impedance || null,
    needs_amp: comp?.needs_amp || false,
    amplification_difficulty: comp?.amplification_difficulty || null,
    purchase_price: sc.user_gear?.purchase_price || null,
    image_url: comp?.image_url || null,
    amazon_url: comp?.amazon_url || null,
    crin_tone: comp?.crin_tone || null,
    crin_tech: comp?.crin_tech || null,
    crin_rank: comp?.crin_rank || null,
    crin_value: comp?.crin_value || null,
    crin_signature: comp?.crin_signature || null,
    asr_sinad: comp?.asr_sinad || null,
    fr_data: comp?.fr_data || null,
    driver_type: comp?.driver_type || null,
    fit: comp?.fit || null,
    why_recommended: comp?.why_recommended || '',
    source: sc.user_gear_id ? 'gear' : 'recommendation',
    user_gear_id: sc.user_gear_id || null,
    component_id: sc.component_id || null,
    stack_component_id: sc.id,
  }
}

export function checkStackCompatibility(stack: StackWithGear): CompatibilityWarning[] {
  const warnings: CompatibilityWarning[] = []
  const normalizedComponents = stack.stack_components.map(sc => ({
    ...getStackComponentData(sc),
    _sc: sc,
  }))

  // Check for headphones without amp/DAC when they need power.
  // Categories go through normalizeCategory because stack entries may carry a
  // user-supplied `custom_category` with a legacy spelling.
  const headphones = normalizedComponents.filter(c =>
    isCategoryIn(c.category, HEADPHONE_CATEGORIES)
  )
  const amps = normalizedComponents.filter(c => isCategoryIn(c.category, AMP_CATEGORIES))

  headphones.forEach(hp => {
    // Shared threshold — previously 150Ω here, 80Ω in the stack builder and in
    // gear.ts, so the same headphone got contradictory verdicts per screen.
    if (needsAmplification(hp)) {
      if (amps.length === 0) {
        warnings.push({
          type: 'power',
          severity: 'warning',
          message: 'These headphones would benefit from a dedicated amplifier',
          components: [`${hp.brand} ${hp.name}`]
        })
      }
    }
  })

  // Check for multiple headphones
  if (headphones.length > 1) {
    warnings.push({
      type: 'category',
      severity: 'warning',
      message: 'Multiple headphones in one stack',
      components: headphones.map(h => `${h.brand} ${h.name}`)
    })
  }

  return warnings
}

export const stackTemplates: StackTemplate[] = [
  {
    id: 'desktop-setup',
    name: 'Desktop Setup',
    description: 'Complete desktop audio workstation with headphones, DAC, and amp',
    budgetRange: { min: 300, max: 2000 },
    categories: ['headphones', 'dacs', 'amps'],
    icon: '🖥️'
  },
  {
    id: 'portable-rig',
    name: 'Portable Rig',
    description: 'Mobile setup with IEMs and portable DAC/amp',
    budgetRange: { min: 200, max: 800 },
    categories: ['iems', 'combo'],
    icon: '🎒'
  },
  {
    id: 'gaming-setup',
    name: 'Gaming Setup',
    description: 'Gaming-optimized headphones with microphone and sound processing',
    budgetRange: { min: 150, max: 600 },
    categories: ['headphones', 'combo'],
    icon: '🎮'
  },
  {
    id: 'audiophile-stack',
    name: 'Audiophile Stack',
    description: 'High-end reference setup for critical listening',
    budgetRange: { min: 1000, max: 5000 },
    categories: ['headphones', 'dacs', 'amps'],
    icon: '👂'
  }
]

export const purposeIcons: Record<StackPurpose, string> = {
  desktop: '🖥️',
  portable: '🎒',
  studio: '🎵',
  gaming: '🎮',
  office: '💼',
  general: '📦',
}

export function calculateStackValue(stack: StackWithGear): {
  totalPaid: number
  currentValue: number
  depreciation: number
  componentCount: number
} {
  let totalPaid = 0
  let currentValue = 0

  stack.stack_components.forEach(sc => {
    const data = getStackComponentData(sc)

    // Add purchase price if available (only from user gear)
    if (data.purchase_price) {
      totalPaid += parseFloat(data.purchase_price.toString())
    }

    // Add current value estimate
    if (data.price_used_min && data.price_used_max) {
      currentValue += (data.price_used_min + data.price_used_max) / 2
    } else if (data.price_new) {
      currentValue += data.price_new * 0.7
    } else if (data.purchase_price) {
      currentValue += parseFloat(data.purchase_price.toString()) * 0.7
    }
  })

  return {
    totalPaid,
    currentValue,
    depreciation: currentValue - totalPaid,
    componentCount: stack.stack_components.length
  }
}
