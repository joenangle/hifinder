import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export const revalidate = 3600

export async function GET() {
  try {
    const { data: systems, error: systemsError } = await supabaseServer
      .from('curated_systems')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('display_order')

    if (systemsError) {
      console.error('Error fetching curated systems:', systemsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!systems || systems.length === 0) {
      return NextResponse.json({ systems: [] })
    }

    // Collect all unique component IDs across all systems
    const allComponentIds = [...new Set(systems.flatMap(s => s.component_ids))]

    const { data: components, error: componentsError } = await supabaseServer
      .from('components')
      .select('*')
      .in('id', allComponentIds)

    if (componentsError) {
      console.error('Error fetching components:', componentsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const componentMap = new Map(components?.map(c => [c.id, c]) || [])

    // Zip systems with their full component objects
    const enriched = systems.map(system => ({
      id: system.id,
      name: system.name,
      description: system.description,
      category: system.category,
      budget_tier: system.budget_tier,
      rationale: system.rationale,
      components: system.component_ids
        .map((id: string) => componentMap.get(id))
        .filter(Boolean),
    }))

    return NextResponse.json({ systems: enriched })
  } catch (error) {
    console.error('Error in curated-systems API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
