import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user gear with components
    const { data: gear, error: gearError } = await supabaseServer
      .from('user_gear')
      .select(`
        *,
        components (
          id, name, brand, category, price_new, price_used_min, price_used_max,
          budget_tier, sound_signature, use_cases, impedance, needs_amp,
          amazon_url, why_recommended, image_url
        )
      `)
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (gearError) {
      console.error('Error fetching gear:', gearError)
      return NextResponse.json({ error: 'Failed to fetch gear' }, { status: 500 })
    }

    // Fetch user stacks with gear and components
    const { data: stacks, error: stacksError } = await supabaseServer
      .from('user_stacks')
      .select(`
        *,
        stack_components (
          id,
          position,
          user_gear_id,
          user_gear (
            id,
            custom_name,
            custom_brand,
            custom_category,
            purchase_price,
            component_id,
            components (
              id, name, brand, category, price_new, price_used_min, price_used_max
            )
          )
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (stacksError) {
      console.error('Error fetching stacks:', stacksError)
      return NextResponse.json({ error: 'Failed to fetch stacks' }, { status: 500 })
    }

    // Calculate collection statistics
    const totalPaid = (gear || []).reduce((sum, item) => {
      return sum + (item.purchase_price || 0)
    }, 0)

    const currentValue = (gear || []).reduce((sum, item) => {
      const component = item.components
      if (component?.price_used_min && component?.price_used_max) {
        const avgUsedPrice = (component.price_used_min + component.price_used_max) / 2
        return sum + avgUsedPrice
      }
      return sum + (item.purchase_price || 0)
    }, 0)

    const depreciation = totalPaid > 0 ? ((totalPaid - currentValue) / totalPaid) * 100 : 0

    // Calculate by category
    const byCategory = (gear || []).reduce((acc, item) => {
      const category = item.components?.category || 'other'
      if (!acc[category]) {
        acc[category] = { paid: 0, current: 0 }
      }
      acc[category].paid += item.purchase_price || 0
      
      const component = item.components
      if (component?.price_used_min && component?.price_used_max) {
        acc[category].current += (component.price_used_min + component.price_used_max) / 2
      } else {
        acc[category].current += item.purchase_price || 0
      }
      
      return acc
    }, {} as Record<string, { paid: number; current: number }>)

    const collectionStats = {
      totalPaid,
      currentValue,
      depreciation,
      byCategory
    }

    return NextResponse.json({
      gear: gear || [],
      stacks: stacks || [],
      collectionStats
    })

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}