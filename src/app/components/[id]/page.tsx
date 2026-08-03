import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { supabaseServer } from '@/lib/supabase-server'
import { buildComponentSeo, categoryLabel } from '@/lib/component-detail'
import { getRetailerLinks } from '@/lib/retailer-links'
import { WishlistButton } from '@/components/WishlistButton'
import { FindUsedButton } from '@/components/marketplace/FindUsedButton'
import { PriceAlertButton } from '@/components/PriceAlertButton'
import { EbayAffiliateCTA } from '@/components/marketplace/EbayAffiliateCTA'

const BASE_URL = 'https://hifinder.app'

type Params = Promise<{ id: string }>

async function getComponent(id: string) {
  const { data } = await supabaseServer.from('components').select('*').eq('id', id).maybeSingle()
  return data
}

async function getActiveListingCount(id: string): Promise<number> {
  const { count } = await supabaseServer
    .from('used_listings')
    .select('id', { count: 'exact', head: true })
    .eq('component_id', id)
    .eq('status', 'available')
  return count ?? 0
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const c = await getComponent(id)
  if (!c) return { title: 'Component not found | HiFinder' }

  const { title, description } = buildComponentSeo(c)
  const images = c.image_url ? [{ url: c.image_url }] : undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/components/${id}`,
      siteName: 'HiFinder',
      type: 'website',
      locale: 'en_US',
      images,
    },
    twitter: {
      card: c.image_url ? 'summary_large_image' : 'summary',
      title,
      description,
      images: c.image_url ? [c.image_url] : undefined,
    },
  }
}

function Spec({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-border last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-foreground font-medium text-right">{value}</dd>
    </div>
  )
}

export default async function ComponentDetailPage({ params }: { params: Params }) {
  const { id } = await params
  const c = await getComponent(id)
  if (!c) notFound()

  const listingCount = await getActiveListingCount(id)
  const retailers = getRetailerLinks({
    id: c.id,
    brand: c.brand,
    name: c.name,
    category: c.category as 'cans' | 'iems' | 'dac' | 'amp' | 'dac_amp' | 'cable',
    amazon_url: c.amazon_url,
  })

  const avgPrice =
    c.price_used_min && c.price_used_max
      ? (c.price_used_min + c.price_used_max) / 2
      : c.price_new ?? 0

  const priceLabel =
    c.price_used_min && c.price_used_max
      ? `$${Math.round(c.price_used_min)}–$${Math.round(c.price_used_max)} used`
      : c.price_new
        ? `$${Math.round(c.price_new)} new`
        : 'Price unknown'

  return (
    <div className="min-h-screen bg-primary">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/browse"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to catalog
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image */}
          <div className="bg-surface-elevated border border-border rounded-lg p-6 flex items-center justify-center">
            {c.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.image_url}
                alt={`${c.brand} ${c.name}`}
                className="max-h-72 w-auto object-contain"
              />
            ) : (
              <div className="text-muted text-sm py-20">No image available</div>
            )}
          </div>

          {/* Header + actions */}
          <div>
            <div className="text-xs text-muted uppercase tracking-wide mb-1">
              {categoryLabel(c.category)}
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {c.brand} {c.name}
            </h1>
            <div className="mt-2 text-lg text-foreground">{priceLabel}</div>

            <div className="mt-3 flex flex-wrap gap-2">
              {c.sound_signature && (
                <span className="px-2 py-0.5 bg-surface-secondary text-muted text-xs rounded capitalize">
                  {c.sound_signature}
                </span>
              )}
              {c.crin_rank && (
                <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded">
                  Crinacle {c.crin_rank}
                </span>
              )}
              {c.asr_sinad != null && (
                <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded">
                  SINAD {c.asr_sinad}
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {listingCount > 0 ? (
                <FindUsedButton
                  componentId={c.id}
                  componentName={c.name}
                  brand={c.brand}
                  listingCount={listingCount}
                  showText
                />
              ) : (
                <PriceAlertButton componentId={c.id} avgPrice={avgPrice} priceFloor={c.price_used_min} showText />
              )}
              <WishlistButton componentId={c.id} className="px-3" showText />
            </div>

            <div className="mt-3">
              <EbayAffiliateCTA
                component={{ id: c.id, brand: c.brand, name: c.name, category: c.category as 'cans' | 'iems' | 'dac' | 'amp' | 'dac_amp' | 'cable' }}
                source="component_detail"
              />
            </div>

            {retailers.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {retailers.map((r) => (
                  <a
                    key={r.name}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {r.name} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Specs + expert notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
          <div className="bg-surface-elevated border border-border rounded-lg p-6">
            <h2 className="font-semibold text-foreground mb-3">Specifications</h2>
            <dl>
              <Spec label="Category" value={categoryLabel(c.category)} />
              <Spec label="Impedance" value={c.impedance != null ? `${c.impedance} Ω` : null} />
              <Spec label="Driver type" value={c.driver_type} />
              <Spec label="Fit" value={c.fit} />
              <Spec label="Needs amp" value={c.needs_amp == null ? null : c.needs_amp ? 'Yes' : 'No'} />
              <Spec label="Amplification" value={c.amplification_difficulty} />
              <Spec label="Power output" value={c.power_output} />
              <Spec label="Sensitivity" value={c.sensitivity_db_mw != null ? `${c.sensitivity_db_mw} dB/mW` : null} />
            </dl>
          </div>

          <div className="bg-surface-elevated border border-border rounded-lg p-6">
            <h2 className="font-semibold text-foreground mb-3">Expert assessment</h2>
            <dl>
              <Spec label="Crinacle rank" value={c.crin_rank} />
              <Spec label="Tone grade" value={c.crin_tone} />
              <Spec label="Technical grade" value={c.crin_tech} />
              <Spec label="ASR SINAD" value={c.asr_sinad} />
            </dl>
            {(c.crin_comments || c.why_recommended) && (
              <p className="mt-3 text-sm text-muted leading-relaxed">
                {c.crin_comments || c.why_recommended}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
