'use client'

import { Component } from '@/types'
import { X, Volume2, Cpu, Zap, TrendingUp } from 'lucide-react'
import { AmplificationBadge } from './AmplificationIndicator'
import { assessAmplificationFromImpedance } from '@/lib/audio-calculations'
import { PriceHistoryChart } from './PriceHistoryChart'

interface ComponentDetailModalProps {
  component: Component
  isOpen: boolean
  onClose: () => void
}

export function ComponentDetailModal({ component, isOpen, onClose }: ComponentDetailModalProps) {
  if (!isOpen) return null

  const amplificationAssessment = assessAmplificationFromImpedance(
    component.impedance,
    component.needs_amp,
    component.name,
    component.brand
  )

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-surface-elevated border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {component.brand} {component.name}
            </h2>
            <p className="text-muted mt-1">
              {component.category.charAt(0).toUpperCase() + component.category.slice(1)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Price Range */}
          <div className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg">
            <div>
              <h3 className="font-semibold text-foreground">Typical Used Price Range</h3>
              <p className="text-sm text-muted">Based on recent marketplace data</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">
                {component.price_used_min && component.price_used_max ? (
                  `${formatPrice(component.price_used_min)} - ${formatPrice(component.price_used_max)}`
                ) : (
                  'Price data unavailable'
                )}
              </div>
              {component.price_new && (
                <div className="text-sm text-muted">
                  New: {formatPrice(component.price_new)}
                </div>
              )}
            </div>
          </div>

          {/* Price History Chart */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-foreground">Sold Price History</h3>
            </div>
            <PriceHistoryChart
              componentId={component.id}
              priceNew={component.price_new}
            />
          </div>

          {/* Amplification Requirements */}
          {amplificationAssessment.difficulty !== 'unknown' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-foreground">Amplification Requirements</h3>
              </div>
              <div className="p-4 bg-surface-secondary rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <AmplificationBadge difficulty={amplificationAssessment.difficulty} />
                  <span className="text-foreground font-medium">
                    {amplificationAssessment.difficulty === 'easy' && 'Easy to Drive'}
                    {amplificationAssessment.difficulty === 'moderate' && 'Moderate Power Required'}
                    {amplificationAssessment.difficulty === 'demanding' && 'Dedicated Amplifier Recommended'}
                    {amplificationAssessment.difficulty === 'very_demanding' && 'High-Power Amplifier Required'}
                  </span>
                </div>
                <p className="text-sm text-muted">{amplificationAssessment.explanation}</p>
                {component.impedance && (
                  <p className="text-xs text-muted">
                    Impedance: {component.impedance}Ω
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Technical Specifications */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-foreground">Technical Specifications</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {component.impedance && (
                <div className="p-3 bg-surface-secondary rounded">
                  <div className="text-sm text-muted">Impedance</div>
                  <div className="font-medium text-foreground">{component.impedance}Ω</div>
                </div>
              )}
              {/* Driver size, weight, and frequency_response not available in Component interface */}
            </div>
          </div>

          {/* Sound Characteristics */}
          {component.sound_signature && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-foreground">Sound Signature</h3>
              </div>
              <div className="p-4 bg-surface-secondary rounded-lg">
                <div className="font-medium text-foreground capitalize mb-2">
                  {component.sound_signature.replace('_', ' ')}
                </div>
                {component.sound_signature === 'neutral' && (
                  <p className="text-sm text-muted">Balanced sound with accurate reproduction across all frequencies</p>
                )}
                {component.sound_signature === 'warm' && (
                  <p className="text-sm text-muted">Emphasized bass and lower midrange with smooth, relaxed treble</p>
                )}
                {component.sound_signature === 'bright' && (
                  <p className="text-sm text-muted">Emphasized treble and upper midrange for detail and clarity</p>
                )}
                {component.sound_signature === 'fun' && (
                  <p className="text-sm text-muted">Lively and engaging sound with enhanced dynamics</p>
                )}
              </div>
            </div>
          )}

          {/* Additional Details */}
          {/* Notes not available in Component interface */}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}