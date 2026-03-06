import { Suspense } from 'react'
import { PriceHistoryContent } from './price-history-content'

export const metadata = {
  title: 'Price History | HiFinder',
  description: 'Check used market prices for headphones, IEMs, DACs, and amps. See price trends, sold listings, and market statistics.',
}

export default function PriceHistoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    }>
      <PriceHistoryContent />
    </Suspense>
  )
}
