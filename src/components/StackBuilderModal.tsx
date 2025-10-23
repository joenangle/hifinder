'use client'

import { useState, useEffect } from 'react'
import { Component } from '@/types'
import { CompatibilityWarning } from '@/lib/stacks'

interface StackBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  selectedComponents: {
    headphones: Component[]
    dacs: Component[]
    amps: Component[]
    combos: Component[]
  }
  onSaveStack?: (stackName: string, components: Component[]) => void
}

interface StackComponent extends Component {
  stackPosition: 'source' | 'dac' | 'amp' | 'headphones'
}

export function StackBuilderModal({
  isOpen,
  onClose,
  selectedComponents,
  onSaveStack
}: StackBuilderModalProps) {
  const [stackName, setStackName] = useState('')
  const [stackDescription, setStackDescription] = useState('')
  const [finalComponents, setFinalComponents] = useState<StackComponent[]>([])
  const [warnings, setWarnings] = useState<CompatibilityWarning[]>([])
  const [saving, setSaving] = useState(false)

  // Organize components into stack positions
  useEffect(() => {
    if (!isOpen) return

    const components: StackComponent[] = []

    // Add selected components with stack positions
    selectedComponents.headphones.forEach(hp => {
      components.push({ ...hp, stackPosition: 'headphones' })
    })

    selectedComponents.dacs.forEach(dac => {
      components.push({ ...dac, stackPosition: 'dac' })
    })

    selectedComponents.amps.forEach(amp => {
      components.push({ ...amp, stackPosition: 'amp' })
    })

    selectedComponents.combos.forEach(combo => {
      // Combos serve as both DAC and amp
      components.push({ ...combo, stackPosition: 'dac' })
    })

    setFinalComponents(components)

    // Generate compatibility warnings
    // TODO: Implement compatibility checking
    const mockWarnings: CompatibilityWarning[] = []

    // Check for high impedance headphones without amplification
    const highImpedanceHP = selectedComponents.headphones.filter(hp =>
      hp.impedance && parseInt(hp.impedance.toString()) > 150
    )

    if (highImpedanceHP.length > 0 &&
        selectedComponents.amps.length === 0 &&
        selectedComponents.combos.length === 0) {
      mockWarnings.push({
        type: 'power',
        severity: 'warning',
        message: 'High impedance headphones may need amplification for optimal performance',
        components: highImpedanceHP.map(hp => hp.name)
      })
    }

    // Check for multiple headphones
    if (selectedComponents.headphones.length > 1) {
      mockWarnings.push({
        type: 'category',
        severity: 'warning',
        message: 'Multiple headphones selected - consider creating separate stacks',
        components: selectedComponents.headphones.map(hp => hp.name)
      })
    }

    setWarnings(mockWarnings)

    // Auto-generate stack name
    const types = []
    if (selectedComponents.headphones.length > 0) types.push('Headphones')
    if (selectedComponents.dacs.length > 0) types.push('DAC')
    if (selectedComponents.amps.length > 0) types.push('Amp')
    if (selectedComponents.combos.length > 0) types.push('DAC/Amp')

    const autoName = types.length > 0 ? `${types.join(' + ')} Stack` : 'My Audio Stack'
    setStackName(autoName)
  }, [isOpen, selectedComponents])

  // Calculate total cost
  const totalCost = finalComponents.reduce((sum, component) => {
    const avgPrice = component.price_used_min && component.price_used_max
      ? (component.price_used_min + component.price_used_max) / 2
      : component.price_new || 0
    return sum + avgPrice
  }, 0)

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)
  }

  // Handle save
  const handleSave = async () => {
    if (!stackName.trim()) return

    setSaving(true)
    try {
      if (onSaveStack) {
        await onSaveStack(stackName, finalComponents)
      }
      onClose()
    } catch (error) {
      console.error('Failed to save stack:', error)
    } finally {
      setSaving(false)
    }
  }

  // Remove component
  const removeComponent = (componentId: string) => {
    setFinalComponents(prev => prev.filter(c => c.id !== componentId))
  }

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'headphones': return '🎧'
      case 'iems': return '👂'
      case 'dacs': return '🔄'
      case 'amps': return '⚡'
      case 'combo': return '🎯'
      default: return '🔧'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-[10001]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Build Your Audio Stack</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-900 dark:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stack Overview */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Stack Overview</h3>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatPrice(totalCost)}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Total</p>
              </div>
            </div>

            {/* Components List */}
            <div className="space-y-3">
              {finalComponents.map((component) => (
                <div
                  key={component.id}
                  className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border border-gray-300 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {getCategoryIcon(component.category)}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{component.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{component.brand} • {component.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatPrice(
                        component.price_used_min && component.price_used_max
                          ? (component.price_used_min + component.price_used_max) / 2
                          : component.price_new || 0
                      )}
                    </span>
                    <button
                      onClick={() => removeComponent(component.id)}
                      className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {finalComponents.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-300">
                  <p className="text-gray-600 dark:text-gray-200">No components selected</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Go back and select some components to build your stack</p>
                </div>
              )}
            </div>
          </div>

          {/* Compatibility Warnings */}
          {warnings.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Compatibility Notes
              </h4>
              <div className="space-y-2">
                {warnings.map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-700 dark:text-yellow-400">
                    <p className="font-medium">{warning.message}</p>
                    {warning.components.length > 0 && (
                      <p className="text-xs mt-1">Affects: {warning.components.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stack Details Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Stack Name
              </label>
              <input
                type="text"
                value={stackName}
                onChange={(e) => setStackName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent"
                placeholder="e.g., Desktop Listening Setup"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={stackDescription}
                onChange={(e) => setStackDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 focus:border-transparent"
                placeholder="Describe your stack, use cases, or notes..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => {
                const shareUrl = `${window.location.origin}/recommendations?` +
                  `budget=${Math.round(totalCost)}&` +
                  `components=${finalComponents.map(c => c.id).join(',')}`
                navigator.clipboard.writeText(shareUrl)
                // TODO: Show toast notification
              }}
              className="px-4 py-2 text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-600 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              Share Stack
            </button>

            <button
              onClick={handleSave}
              disabled={!stackName.trim() || finalComponents.length === 0 || saving}
              className="px-6 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving && (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Save Stack
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}