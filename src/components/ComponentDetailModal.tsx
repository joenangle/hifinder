'use client'

import { Component } from '@/types'
import { X, Volume2, Cpu, Zap, TrendingUp } from 'lucide-react'
import { AmplificationBadge } from './AmplificationIndicator'
import { assessAmplificationFromImpedance } from '@/lib/audio-calculations'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'

const PriceHistoryChart = dynamic(
  () => import('./PriceHistoryChart').then(mod => ({ default: mod.PriceHistoryChart })),
  { ssr: false }
)
import { useState, useEffect, useRef, useCallback } from 'react'

interface ComponentDetailModalProps {
  component: Component
  isOpen: boolean
  onClose: () => void
}

export function ComponentDetailModal({ component, isOpen, onClose }: ComponentDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // ESC to close + body scroll lock
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }, [onClose])

  const amplificationAssessment = assessAmplificationFromImpedance(
    component.impedance,
    component.needs_amp,
    component.name,
    component.brand
  )

  // Fetch actual sales data for this component
  const [marketData, setMarketData] = useState<{
    count: number; median: number; min: number; max: number
  } | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    fetch(`/api/components/${component.id}/price-history?days=90`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.statistics && data.statistics.count >= 3) {
          setMarketData({
            count: data.statistics.count,
            median: data.statistics.median,
            min: data.statistics.min,
            max: data.statistics.max,
          })
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isOpen, component.id])

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 'var(--z-modal, 40)' }}
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={`${component.brand} ${component.name} details`}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[8px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden
          />

          {/* Container */}
          <motion.div
            ref={modalRef}
            className="relative bg-surface-elevated border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)'
            }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 5 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-primary">
              {component.brand} {component.name}
            </h2>
            <p className="text-secondary mt-1">
              {component.category.charAt(0).toUpperCase() + component.category.slice(1)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-md transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Price Range — enhanced with actual market data */}
          <div className="p-4 bg-secondary rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-primary">
                  {marketData ? 'Market Value' : 'Typical Used Price Range'}
                </h3>
                <p className="text-sm text-secondary">
                  {marketData
                    ? `Based on ${marketData.count} recent sale${marketData.count !== 1 ? 's' : ''}`
                    : 'Based on recent marketplace data'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary">
                  {marketData ? (
                    `${formatPrice(marketData.min)} - ${formatPrice(marketData.max)}`
                  ) : component.price_used_min && component.price_used_max ? (
                    `${formatPrice(component.price_used_min)} - ${formatPrice(component.price_used_max)}`
                  ) : (
                    'Price data unavailable'
                  )}
                </div>
                {marketData && (
                  <div className="text-sm text-secondary">
                    Median: {formatPrice(marketData.median)}
                  </div>
                )}
                {component.price_new && (
                  <div className="text-sm text-secondary">
                    New: {formatPrice(component.price_new)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Price History Chart */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-primary">Sold Price History</h3>
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
                <h3 className="font-semibold text-primary">Amplification Requirements</h3>
              </div>
              <div className="p-4 bg-secondary rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <AmplificationBadge difficulty={amplificationAssessment.difficulty} />
                  <span className="text-primary font-medium">
                    {amplificationAssessment.difficulty === 'easy' && 'Easy to Drive'}
                    {amplificationAssessment.difficulty === 'moderate' && 'Moderate Power Required'}
                    {amplificationAssessment.difficulty === 'demanding' && 'Dedicated Amplifier Recommended'}
                    {amplificationAssessment.difficulty === 'very_demanding' && 'High-Power Amplifier Required'}
                  </span>
                </div>
                <p className="text-sm text-secondary">{amplificationAssessment.explanation}</p>
                {component.impedance && (
                  <p className="text-xs text-tertiary">
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
              <h3 className="font-semibold text-primary">Technical Specifications</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {component.impedance && (
                <div className="p-3 bg-secondary rounded">
                  <div className="text-sm text-secondary">Impedance</div>
                  <div className="font-medium text-primary">{component.impedance}Ω</div>
                </div>
              )}
            </div>
          </div>

          {/* Sound Characteristics */}
          {component.sound_signature && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-primary">Sound Signature</h3>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <div className="font-medium text-primary capitalize mb-2">
                  {component.sound_signature.replace('_', ' ')}
                </div>
                {component.sound_signature === 'neutral' && (
                  <p className="text-sm text-secondary">Balanced sound with accurate reproduction across all frequencies</p>
                )}
                {component.sound_signature === 'warm' && (
                  <p className="text-sm text-secondary">Emphasized bass and lower midrange with smooth, relaxed treble</p>
                )}
                {component.sound_signature === 'bright' && (
                  <p className="text-sm text-secondary">Emphasized treble and upper midrange for detail and clarity</p>
                )}
                {component.sound_signature === 'fun' && (
                  <p className="text-sm text-secondary">Lively and engaging sound with enhanced dynamics</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="button button-primary w-full"
          >
            Close
          </button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
