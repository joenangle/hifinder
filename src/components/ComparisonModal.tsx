'use client'

import { useEffect } from 'react'
import { ComparisonTable } from './ComparisonTable'

interface ComparisonItem {
  id: string
  brand: string
  name: string
  category: string
  price_new?: number | null
  price_used_min?: number | null
  price_used_max?: number | null
  matchScore?: number
  crinacle_sound_signature?: string | null
  sound_signature?: 'neutral' | 'warm' | 'bright' | 'fun' | null
  crin_tone?: string | null
  crin_tech?: string | null
  crin_rank?: number | null
  crin_value?: number | null
  impedance?: number | null
  fit?: string | null
  driver_type?: string | null
  asr_sinad?: number | null
  power_output_mw?: number
  thd_n?: number
  amplificationAssessment?: {
    difficulty: 'easy' | 'moderate' | 'demanding' | 'very_demanding' | 'unknown'
    explanation: string
  }
}

interface ComparisonModalProps {
  items: ComparisonItem[]
  onClose: () => void
}

export function ComparisonModal({ items, onClose }: ComparisonModalProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Specification', ...items.map(i => `${i.brand} ${i.name}`)]
    const rows: string[][] = [headers]

    // Add data rows
    const addRow = (label: string, values: (string | number | null | undefined)[]) => {
      rows.push([label, ...values.map(v => v?.toString() || 'N/A')])
    }

    addRow('Category', items.map(i => i.category))
    addRow('Used Price Min', items.map(i => i.price_used_min))
    addRow('Used Price Max', items.map(i => i.price_used_max))
    addRow('MSRP', items.map(i => i.price_new))
    addRow('Match Score', items.map(i => i.matchScore))
    addRow('Tone Grade', items.map(i => i.crin_tone))
    addRow('Tech Grade', items.map(i => i.crin_tech))
    addRow('Rank', items.map(i => i.crin_rank))
    addRow('Value Rating', items.map(i => i.crin_value))
    addRow('Sound Signature', items.map(i => i.crinacle_sound_signature || i.sound_signature))
    addRow('Impedance', items.map(i => i.impedance))
    addRow('Fit', items.map(i => i.fit))
    addRow('Driver Type', items.map(i => i.driver_type))
    addRow('SINAD', items.map(i => i.asr_sinad))
    addRow('Power Output (mW)', items.map(i => i.power_output_mw))
    addRow('THD+N', items.map(i => i.thd_n))

    // Convert to CSV string
    const csvContent = rows.map(row =>
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hifinder-comparison-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopyLink = () => {
    const ids = items.map(i => i.id).join(',')
    const url = `${window.location.origin}${window.location.pathname}?compare=${ids}`
    navigator.clipboard.writeText(url)
    // Could add toast notification here
    alert('Comparison link copied to clipboard!')
  }

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center backdrop-blur-sm bg-black/30"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-modal-title"
    >
      <div
        className="relative w-full sm:max-w-[95vw] sm:max-h-[90vh] max-h-full sm:rounded-lg rounded-none bg-surface-primary dark:bg-surface-primary shadow-2xl flex flex-col"
        style={{
          background: 'var(--surface-primary)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h2 id="comparison-modal-title" className="text-xl font-bold text-primary">
              Component Comparison
            </h2>
            <p className="text-sm text-tertiary mt-1">
              Comparing {items.length} {items.length === 1 ? 'item' : 'items'} side-by-side
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-tertiary hover:text-primary dark:hover:text-primary hover:bg-surface-hover dark:hover:bg-surface-hover rounded-lg transition-colors"
            aria-label="Close comparison"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <ComparisonTable items={items} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-surface-secondary flex-shrink-0">
          <div className="text-xs text-tertiary">
            Tip: Scroll horizontally to see all specifications
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 text-sm font-medium text-secondary border rounded-lg hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors"
            >
              📋 Copy Link
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 text-sm font-medium text-secondary border rounded-lg hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors"
            >
              📊 Export CSV
            </button>
            <button
              onClick={() => window.print()}
              className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-secondary border rounded-lg hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors"
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-secondary rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
