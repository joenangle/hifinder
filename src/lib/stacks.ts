import { supabaseAdmin } from './supabase-admin'
import { UserGearItem } from './gear'

export interface UserStack {
  id: string
  user_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
  stack_components?: StackComponent[]
}

export interface StackComponent {
  id: string
  stack_id: string
  user_gear_id: string
  position: number
  created_at: string
  user_gear?: UserGearItem
}

export interface StackWithGear extends UserStack {
  stack_components: (StackComponent & { user_gear: UserGearItem })[]
}

export async function getUserStacks(userId: string): Promise<StackWithGear[]> {
  const { data, error } = await supabaseAdminAdmin
    .from('user_stacks')
    .select(`
      *,
      stack_components (
        *,
        user_gear (
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
        )
      )
    `)
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
  const { data, error } = await supabaseAdmin
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
  updates: Partial<Pick<UserStack, 'name' | 'description'>>
): Promise<UserStack | null> {
  const { data, error } = await supabaseAdmin
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
  const { error } = await supabaseAdmin
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
    const { data: existingComponents } = await supabaseAdmin
      .from('stack_components')
      .select('position')
      .eq('stack_id', stackId)
      .order('position', { ascending: false })
      .limit(1)

    position = existingComponents && existingComponents.length > 0 
      ? existingComponents[0].position + 1 
      : 0
  }

  const { data, error } = await supabaseAdmin
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
    return null
  }

  return data as StackComponent
}

export async function removeGearFromStack(
  stackId: string,
  userGearId: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
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

export function calculateStackValue(stack: StackWithGear): {
  totalPaid: number
  currentValue: number
  depreciation: number
  componentCount: number
} {
  let totalPaid = 0
  let currentValue = 0
  
  stack.stack_components.forEach(component => {
    const gear = component.user_gear
    if (gear) {
      // Add purchase price if available
      if (gear.purchase_price) {
        totalPaid += parseFloat(gear.purchase_price.toString())
      }
      
      // Add current value estimate
      if (gear.components?.price_used_min && gear.components?.price_used_max) {
        // Use average of used price range as current value estimate
        const avgUsedPrice = (gear.components.price_used_min + gear.components.price_used_max) / 2
        currentValue += avgUsedPrice
      } else if (gear.components?.price_new) {
        // Estimate 70% of new price if no used prices available
        currentValue += gear.components.price_new * 0.7
      } else if (gear.purchase_price) {
        // Fallback to 70% of purchase price
        currentValue += parseFloat(gear.purchase_price.toString()) * 0.7
      }
    }
  })
  
  return {
    totalPaid,
    currentValue,
    depreciation: currentValue - totalPaid,
    componentCount: stack.stack_components.length
  }
}