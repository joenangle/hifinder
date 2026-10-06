import { headers } from 'next/headers'
import { US_STATES_LIST } from '@/lib/location-normalizer'
import { Marketplace } from './marketplace-content'

export const metadata = {
  title: 'Used Audio Marketplace | HiFinder',
  description:
    'Used headphones, IEMs, DACs and amps from r/AVexchange, Reverb and eBay in one place — filter by price, condition and location, with deal ratings against typical used prices.',
  alternates: { canonical: '/marketplace' },
}

const US_STATE_CODES = new Set(US_STATES_LIST.map(s => s.code))

/** US state code from Vercel's edge geolocation headers, if the visitor is in the US. */
async function detectUsState(): Promise<string | null> {
  const h = await headers()
  const region = h.get('x-vercel-ip-country-region')
  if (h.get('x-vercel-ip-country') !== 'US' || !region) return null
  return US_STATE_CODES.has(region) ? region : null
}

export default async function MarketplacePage() {
  return <Marketplace detectedState={await detectUsState()} />
}
