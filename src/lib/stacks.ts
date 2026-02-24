import { supabase } from './supabase'
import { UserGearItem } from './gear'
import { Component } from '@/types'

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

export interface StackWithGear extends UserStack {
  stack_components: StackComponent[]
}

// Normalized data from either user_gear→components or direct components path
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
    driver_type: comp?.driver_type || null,
    fit: comp?.fit || null,
    why_recommended: comp?.why_recommended || '',
    source: sc.user_gear_id ? 'gear' : 'recommendation',
    user_gear_id: sc.user_gear_id || null,
    component_id: sc.component_id || null,
    stack_component_id: sc.id,
  }
}

// Common select fields for stack component queries
const STACK_COMPONENT_SELECT = `
  *,
  stack_components (
    id,
    position,
    user_gear_id,
    component_id,
    created_at,
    user_gear (
      *,
      components (
        id, name, brand, category, price_new, price_used_min, price_used_max,
        budget_tier, sound_signature, use_cases, impedance, needs_amp,
        amplification_difficulty, amazon_url, why_recommended, image_url,
        crin_tone, crin_tech, crin_rank, crin_value, crin_signature,
        asr_sinad, driver_type, fit
      )
    ),
    components!stack_components_component_id_fkey (
      id, name, brand, category, price_new, price_used_min, price_used_max,
      budget_tier, sound_signature, use_cases, impedance, needs_amp,
      amplification_difficulty, amazon_url, why_recommended, image_url,
      crin_tone, crin_tech, crin_rank, crin_value, crin_signature,
      asr_sinad, driver_type, fit
    )
  )
`

export async function getUserStacks(userId: string): Promise<StackWithGear[]> {
  const { data, error } = await supabase
    .from('user_stacks')
    .select(STACK_COMPONENT_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user stacks:', error)
    return []
  }

  return data as StackWithGear[]
}

export async function createStack(
  userId: string,
  name: string,
  description?: string
): Promise<UserStack | null> {
  const { data, error } = await supabase
    .from('user_stacks')
    .insert({
      user_id: userId,
      name,
      description
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating stack:', error)
    return null
  }

  return data as UserStack
}

export async function updateStack(
  stackId: string,
  updates: Partial<Pick<UserStack, 'name' | 'description' | 'purpose' | 'is_primary'>>
): Promise<UserStack | null> {
  const { data, error } = await supabase
    .from('user_stacks')
    .update(updates)
    .eq('id', stackId)
    .select()
    .single()

  if (error) {
    console.error('Error updating stack:', error)
    return null
  }

  return data as UserStack
}

export async function deleteStack(stackId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_stacks')
    .delete()
    .eq('id', stackId)

  if (error) {
    console.error('Error deleting stack:', error)
    return false
  }

  return true
}

export async function addGearToStack(
  stackId: string,
  userGearId: string,
  position?: number
): Promise<StackComponent | null> {
  // If no position specified, add to end
  if (position === undefined) {
    const { data: existingComponents } = await supabase
      .from('stack_components')
      .select('position')
      .eq('stack_id', stackId)
      .order('position', { ascending: false })
      .limit(1)

    position = existingComponents && existingComponents.length > 0
      ? existingComponents[0].position + 1
      : 0
  }

  const { data, error } = await supabase
    .from('stack_components')
    .insert({
      stack_id: stackId,
      user_gear_id: userGearId,
      position
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding gear to stack:', error)
    // Provide more specific error feedback for duplicates
    if (error.message?.includes('duplicate key')) {
      throw new Error('This gear is already in the stack')
    }
    throw new Error(error.message || 'Failed to add gear to stack')
  }

  return data as StackComponent
}

export async function removeGearFromStack(
  stackId: string,
  userGearId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('stack_components')
    .delete()
    .eq('stack_id', stackId)
    .eq('user_gear_id', userGearId)

  if (error) {
    console.error('Error removing gear from stack:', error)
    return false
  }

  return true
}

export async function removeComponentFromStack(
  stackId: string,
  componentId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('stack_components')
    .delete()
    .eq('stack_id', stackId)
    .eq('component_id', componentId)

  if (error) {
    console.error('Error removing component from stack:', error)
    return false
  }

  return true
}

export async function reorderStackComponents(
  stackId: string,
  componentOrder: { id: string; position: number }[]
): Promise<boolean> {
  // Update positions for all components in the stack
  const updates = componentOrder.map(({ id, position }) =>
    supabase
      .from('stack_components')
      .update({ position })
      .eq('id', id)
      .eq('stack_id', stackId)
  )

  try {
    await Promise.all(updates)
    return true
  } catch (error) {
    console.error('Error reordering stack components:', error)
    return false
  }
}

export interface CompatibilityWarning {
  type: 'impedance' | 'power' | 'category' | 'connectivity'
  severity: 'warning' | 'error'
  message: string
  components: string[]
}

export function checkStackCompatibility(stack: StackWithGear): CompatibilityWarning[] {
  const warnings: CompatibilityWarning[] = []
  const normalizedComponents = stack.stack_components.map(sc => ({
    ...getStackComponentData(sc),
    _sc: sc,
  }))

  // Check for headphones without amp/DAC when high impedance
  const headphones = normalizedComponents.filter(c =>
    c.category === 'headphones' || c.category === 'cans'
  )
  const amps = normalizedComponents.filter(c =>
    c.category === 'amps' || c.category === 'amp'
  )
  const combos = normalizedComponents.filter(c =>
    c.category === 'combo' || c.category === 'dac_amp'
  )

  headphones.forEach(hp => {
    if ((hp.impedance && hp.impedance > 150) || hp.needs_amp) {
      if (amps.length === 0 && combos.length === 0) {
        warnings.push({
          type: 'power',
          severity: 'warning',
          message: 'High impedance headphones may need amplification',
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

export interface StackTemplate {
  id: string
  name: string
  description: string
  budgetRange: { min: number; max: number }
  categories: string[]
  icon: string
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
