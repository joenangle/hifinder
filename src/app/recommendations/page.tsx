import { Suspense } from 'react'
import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { RecommendationsContent } from './recommendations-content'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

const BASE_URL = 'https://hifinder.app'

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams
}): Promise<Metadata> {
  const params = await searchParams
  const budget = typeof params.budget === 'string' ? params.budget : undefined
  const components = typeof params.components === 'string' ? params.components : undefined

  // Default metadata
  let title = 'HiFinder — Build Your Perfect Audio Stack'
  let description =
    'Discover headphones, DACs, and amplifiers matched to your budget and preferences. Build, compare, and share your ideal audio system.'

  // If shared stack URL, fetch component names for dynamic OG tags
  if (components) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })

        const ids = components.split(',').filter(Boolean)
        const { data } = await supabase
          .from('components')
          .select('name, brand')
          .in('id', ids)

        if (data && data.length > 0) {
          const names = data.map((c) => `${c.brand} ${c.name}`).join(' + ')
          const budgetStr = budget ? ` — $${budget}` : ''
          title = `HiFinder Stack: ${names}${budgetStr}`
          description = `Check out this ${data.length}-piece audio stack on HiFinder: ${names}.${budgetStr ? ` Budget: $${budget}.` : ''} Build your own at hifinder.app`
        }
      }
    } catch {
      // Fall back to default metadata on any error
    }
  }

  const url = `${BASE_URL}/recommendations${
    components ? `?components=${components}${budget ? `&budget=${budget}` : ''}` : ''
  }`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'HiFinder',
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default function RecommendationsPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container">
          <div className="text-center mt-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          </div>
        </div>
      }
    >
      <RecommendationsContent />
    </Suspense>
  )
}
