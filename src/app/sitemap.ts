import type { MetadataRoute } from 'next'
import { supabaseServer } from '@/lib/supabase-server'

const BASE_URL = 'https://hifinder.app'

// Regenerate daily; the catalogue changes on scraper/admin timescales, not per request
export const revalidate = 86400

const PAGE_SIZE = 1000

const STATIC_PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/recommendations', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/browse', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/marketplace', priority: 0.7, changeFrequency: 'daily' },
  { path: '/price-history', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/learn', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.3, changeFrequency: 'yearly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = STATIC_PAGES.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency,
    priority,
  }))

  // Page through the catalogue: PostgREST caps each response (1000 rows by default)
  const components: { id: string; updated_at: string | null }[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseServer
      .from('components')
      .select('id, updated_at')
      .order('id')
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      // Still serve the static pages rather than failing the whole sitemap
      console.error('sitemap: failed to load components', error)
      return pages
    }
    components.push(...data)
    if (data.length < PAGE_SIZE) break
  }

  return [
    ...pages,
    ...components.map(c => ({
      url: `${BASE_URL}/components/${c.id}`,
      lastModified: c.updated_at ?? undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ]
}
