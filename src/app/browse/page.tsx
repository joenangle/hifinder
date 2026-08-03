import { Suspense } from 'react'
import { BrowseCatalog } from '@/components/browse/BrowseCatalog'

export const metadata = {
  title: 'Browse Catalog | HiFinder',
  description:
    'Search and browse every headphone, IEM, DAC, and amp in the HiFinder catalog — filter by category, sort by price or expert rating, and jump straight to used listings.',
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-primary flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      }
    >
      <BrowseCatalog />
    </Suspense>
  )
}
