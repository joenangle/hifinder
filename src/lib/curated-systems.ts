import { unstable_cache } from 'next/cache'
import { supabaseServer } from '@/lib/supabase-server'
import type { Component } from '@/types'

export interface CuratedSystem {
  id: string
  name: string
  description: string
  category: 'iems' | 'cans'
  budget_tier: number
  rationale: string
  components: Component[]
}

/**
 * Fetches active curated systems with their full component objects.
 *
 * Shared by the `/api/curated-systems` route and the homepage server
 * component so the landing page can render this section in its initial HTML
 * (no client fetch → skeleton → swap waterfall). Cached for an hour to keep
 * it off the per-request DB path; matches the route's previous `revalidate`.
 */
export const getCuratedSystems = unstable_cache(
  async (): Promise<CuratedSystem[]> => {
    const { data: systems, error: systemsError } = await supabaseServer
      .from('curated_systems')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('display_order')

    if (systemsError) throw systemsError
    if (!systems || systems.length === 0) return []

    const allComponentIds = [...new Set(systems.flatMap((s) => s.component_ids))]

    const { data: components, error: componentsError } = await supabaseServer
      .from('components')
      .select('*')
      .in('id', allComponentIds)

    if (componentsError) throw componentsError

    const componentMap = new Map((components ?? []).map((c) => [c.id, c]))

    return systems.map((system) => ({
      id: system.id,
      name: system.name,
      description: system.description,
      category: system.category,
      budget_tier: system.budget_tier,
      rationale: system.rationale,
      components: system.component_ids
        .map((id: string) => componentMap.get(id))
        .filter(Boolean) as Component[],
    }))
  },
  ['curated-systems'],
  { revalidate: 3600, tags: ['curated-systems'] }
)
