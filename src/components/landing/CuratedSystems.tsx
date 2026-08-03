import { getCuratedSystems } from '@/lib/curated-systems'
import { CuratedSystemsClient } from './CuratedSystemsClient'

/**
 * Server component: fetches curated systems at render time (cached 1h) so the
 * "Popular systems" section ships in the homepage's initial HTML. Previously
 * this was a client component that fetched `/api/curated-systems` in a
 * `useEffect`, producing a skeleton-then-content swap that caused layout shift
 * under real-network latency. Only the tab toggle stays client-side.
 */
export async function CuratedSystems() {
  const systems = await getCuratedSystems()
  if (systems.length === 0) return null
  return <CuratedSystemsClient systems={systems} />
}
