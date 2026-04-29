import { supabase } from './supabase'
import { supabaseServer } from './supabase-server'
import type { UserGearItem, GearSuggestion } from '@/types/gear'

export type { UserGearItem, GearSuggestion } from '@/types/gear'

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

export async function getUpgradeSuggestions(
  userId: string
): Promise<GearSuggestion[]> {
  const gear = await getUserGear(userId)
  if (gear.length === 0) return []

  const suggestions: GearSuggestion[] = []

  const hasAmp = gear.some(
    item => item.components?.category === 'amps' || item.components?.category === 'combo'
  )
  const hasDAC = gear.some(
    item => item.components?.category === 'dacs' || item.components?.category === 'combo'
  )

  // 1. missing_amp — high-impedance headphones without an amp
  const highImpedanceHeadphones = gear.filter(
    item => item.components?.impedance && item.components.impedance > 80
  )
  if (highImpedanceHeadphones.length > 0 && !hasAmp) {
    const { data: amps } = await supabaseServer
      .from('components')
      .select('id, brand, name, category, price_new, price_used_min, price_used_max')
      .in('category', ['amps', 'combo'])
      .order('crin_rank', { ascending: true, nullsFirst: false })
      .limit(3)

    suggestions.push({
      type: 'missing_amp',
      priority: 'high',
      message: 'You have high-impedance headphones that would benefit from a dedicated amplifier',
      suggestedItems: amps || [],
    })
  }

  // 2. missing_dac — no DAC or combo in collection
  if (!hasDAC) {
    const { data: dacs } = await supabaseServer
      .from('components')
      .select('id, brand, name, category, price_new, price_used_min, price_used_max')
      .in('category', ['dacs', 'combo'])
      .order('crin_rank', { ascending: true, nullsFirst: false })
      .limit(3)

    suggestions.push({
      type: 'missing_dac',
      priority: 'medium',
      message: 'Consider adding a DAC for better sound quality from digital sources',
      suggestedItems: dacs || [],
    })
  }

  // 3. tier_upgrade — for the first 2 headphones, suggest upgrades at 1.5x–3x price
  const headphones = gear
    .filter(item => item.components?.category === 'cans' || item.components?.category === 'iems')
    .slice(0, 2)

  for (const item of headphones) {
    const comp = item.components
    const price = comp?.price_new
    if (!comp || !price) continue

    const minPrice = Math.round(price * 1.5)
    const maxPrice = Math.round(price * 3)

    const { data: upgrades } = await supabaseServer
      .from('components')
      .select('id, brand, name, category, price_new, price_used_min, price_used_max')
      .eq('category', comp.category)
      .gte('price_new', minPrice)
      .lte('price_new', maxPrice)
      .order('crin_rank', { ascending: true, nullsFirst: false })
      .limit(3)

    if (upgrades && upgrades.length > 0) {
      suggestions.push({
        type: 'tier_upgrade',
        priority: 'low',
        message: `Upgrade from your ${comp.brand} ${comp.name} — here are higher-tier options`,
        currentItem: { brand: comp.brand, name: comp.name, price: price, category: comp.category },
        suggestedItems: upgrades,
      })
    }
  }

  // 4. bottleneck — expensive headphones with cheap source gear
  const headphonesByPrice = gear
    .filter(item => (item.components?.category === 'cans' || item.components?.category === 'iems') && item.components?.price_new)
    .sort((a, b) => (b.components?.price_new || 0) - (a.components?.price_new || 0))

  const sourceGear = gear.filter(
    item => item.components?.category === 'dacs' || item.components?.category === 'amps' || item.components?.category === 'combo'
  )

  const mostExpensiveHeadphone = headphonesByPrice[0]
  const headphonePrice = mostExpensiveHeadphone?.components?.price_new || 0

  if (headphonePrice > 300 && sourceGear.length > 0) {
    const maxSourcePrice = Math.max(
      ...sourceGear.map(item => item.components?.price_new || 0)
    )

    if (maxSourcePrice < headphonePrice * 0.3) {
      const targetPrice = Math.round(headphonePrice * 0.3)
      const minSourceBudget = Math.round(targetPrice * 0.5)
      const maxSourceBudget = Math.round(targetPrice * 2)

      const { data: betterSources } = await supabaseServer
        .from('components')
        .select('id, brand, name, category, price_new, price_used_min, price_used_max')
        .in('category', ['dacs', 'amps', 'combo'])
        .gte('price_new', minSourceBudget)
        .lte('price_new', maxSourceBudget)
        .order('crin_rank', { ascending: true, nullsFirst: false })
        .limit(3)

      if (betterSources && betterSources.length > 0) {
        suggestions.push({
          type: 'bottleneck',
          priority: 'medium',
          message: `Your source gear may be holding back your ${mostExpensiveHeadphone.components!.brand} ${mostExpensiveHeadphone.components!.name}`,
          suggestedItems: betterSources,
        })
      }
    }
  }

  return suggestions
}

