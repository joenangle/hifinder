'use client'

import { Modal } from '@/components/Modal'
import { ExpertAnalysisPanel } from '@/components/ExpertAnalysisPanel'
import { StackComponentData } from '@/lib/stacks'
import { getCategoryLabel, getCategoryColor } from '@/lib/gear-utils'
import { ExternalLink } from 'lucide-react'

interface StackItemDetailModalProps {
  isOpen: boolean
  onClose: () => void
  data: StackComponentData | null
}

const fmt = (amount: number) => `$${Math.round(amount).toLocaleString()}`

function SoundSignaturePill({ signature }: { signature: string }) {
  const colors: Record<string, string> = {
    warm: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
    neutral: 'bg-gray-500/15 text-gray-700 dark:text-gray-300',
    bright: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
    fun: 'bg-pink-500/15 text-pink-700 dark:text-pink-400',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${colors[signature] || 'bg-gray-500/15 text-gray-700 dark:text-gray-300'}`}>
      {signature}
    </span>
  )
}

function AmpDifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    easy: 'text-green-600 dark:text-green-400',
    moderate: 'text-amber-600 dark:text-amber-400',
    demanding: 'text-orange-600 dark:text-orange-400',
    very_demanding: 'text-red-600 dark:text-red-400',
  }
  const label = difficulty.replace('_', ' ')
  return (
    <span className={`capitalize font-medium ${colors[difficulty] || 'text-gray-700 dark:text-gray-300'}`}>
      {label}
    </span>
  )
}

function SinadRating({ sinad }: { sinad: number }) {
  let quality: string
  let color: string
  if (sinad >= 110) { quality = 'Excellent'; color = 'text-green-600 dark:text-green-400' }
  else if (sinad >= 100) { quality = 'Very Good'; color = 'text-emerald-600 dark:text-emerald-400' }
  else if (sinad >= 90) { quality = 'Good'; color = 'text-blue-600 dark:text-blue-400' }
  else if (sinad >= 80) { quality = 'Average'; color = 'text-amber-600 dark:text-amber-400' }
  else { quality = 'Below Average'; color = 'text-red-600 dark:text-red-400' }

  return (
    <span className={`font-medium ${color}`}>
      {sinad} dB ({quality})
    </span>
  )
}

export function StackItemDetailModal({ isOpen, onClose, data }: StackItemDetailModalProps) {
  if (!data) return null

  const catColor = getCategoryColor(data.category)
  const hasExpertData = !!(data.crin_tone || data.crin_tech || data.crin_rank || data.crin_value || data.crin_signature)
  const hasSpecs = !!(data.impedance || data.driver_type || data.fit || data.amplification_difficulty)
  const hasUsedPrice = data.price_used_min && data.price_used_max

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${catColor.bg} ${catColor.text}`}>
              {getCategoryLabel(data.category)}
            </span>
            {data.sound_signature && <SoundSignaturePill signature={data.sound_signature} />}
            {data.source === 'recommendation' && (
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                From Recommendations
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-foreground">{data.brand} {data.name}</h2>
        </div>

        {/* Pricing */}
        <div className="p-4 rounded-lg bg-surface-secondary">
          <h3 className="text-sm font-semibold text-muted mb-3">Pricing</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {hasUsedPrice && (
              <div>
                <div className="text-xs text-muted">Used Market</div>
                <div className="text-lg font-bold text-foreground">
                  {fmt(data.price_used_min!)} - {fmt(data.price_used_max!)}
                </div>
                <div className="text-xs text-muted">
                  Avg: {fmt((data.price_used_min! + data.price_used_max!) / 2)}
                </div>
              </div>
            )}
            {data.price_new && (
              <div>
                <div className="text-xs text-muted">MSRP</div>
                <div className="text-lg font-bold text-foreground">{fmt(data.price_new)}</div>
              </div>
            )}
            {data.purchase_price && (
              <div>
                <div className="text-xs text-muted">You Paid</div>
                <div className="text-lg font-bold text-accent">
                  {fmt(data.purchase_price)}
                </div>
              </div>
            )}
            {!hasUsedPrice && !data.price_new && !data.purchase_price && (
              <div className="text-sm text-muted col-span-full">No pricing data available</div>
            )}
          </div>
        </div>

        {/* Technical Specifications */}
        {hasSpecs && (
          <div>
            <h3 className="text-sm font-semibold text-muted mb-3">Specifications</h3>
            <div className="grid grid-cols-2 gap-3">
              {data.impedance && (
                <div className="p-3 rounded-lg border border-border">
                  <div className="text-xs text-muted">Impedance</div>
                  <div className="font-medium text-foreground">{data.impedance}&#8486;</div>
                </div>
              )}
              {data.driver_type && (
                <div className="p-3 rounded-lg border border-border">
                  <div className="text-xs text-muted">Driver Type</div>
                  <div className="font-medium text-foreground">{data.driver_type}</div>
                </div>
              )}
              {data.fit && (
                <div className="p-3 rounded-lg border border-border">
                  <div className="text-xs text-muted">Fit</div>
                  <div className="font-medium text-foreground capitalize">{data.fit}</div>
                </div>
              )}
              {data.amplification_difficulty && (
                <div className="p-3 rounded-lg border border-border">
                  <div className="text-xs text-muted">Amp Difficulty</div>
                  <div><AmpDifficultyBadge difficulty={data.amplification_difficulty} /></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ASR Measurements */}
        {data.asr_sinad && (
          <div>
            <h3 className="text-sm font-semibold text-muted mb-3">ASR Measurements</h3>
            <div className="p-3 rounded-lg border border-border">
              <div className="text-xs text-muted">SINAD</div>
              <div><SinadRating sinad={data.asr_sinad} /></div>
            </div>
          </div>
        )}

        {/* Expert Analysis */}
        {hasExpertData && (
          <div>
            <h3 className="text-sm font-semibold text-muted mb-2">Expert Analysis</h3>
            <div className="border border-border rounded-lg p-3">
              <ExpertAnalysisPanel
                component={{
                  crin_signature: data.crin_signature,
                  crin_tone: data.crin_tone,
                  crin_tech: data.crin_tech,
                  crin_rank: data.crin_rank,
                  crin_value: data.crin_value,
                  driver_type: data.driver_type,
                  fit: data.fit,
                }}
                forceExpanded={true}
              />
            </div>
          </div>
        )}

        {/* Why Recommended */}
        {data.why_recommended && (
          <div>
            <h3 className="text-sm font-semibold text-muted mb-2">Why Recommended</h3>
            <p className="text-sm text-foreground leading-relaxed">{data.why_recommended}</p>
          </div>
        )}

        {/* Action Links */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
          {data.amazon_url && (
            <a
              href={data.amazon_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border border-border hover:border-accent transition-colors text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View on Amazon
            </a>
          )}
          <a
            href={`/marketplace?q=${encodeURIComponent(`${data.brand} ${data.name}`)}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border border-border hover:border-accent transition-colors text-foreground"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Find Used
          </a>
        </div>
      </div>
    </Modal>
  )
}
