'use client'

import { useState, useEffect } from 'react'
import { Component } from '@/types'
import { CompatibilityWarning } from '@/lib/stacks'
import { generateEbayAffiliateLinkAdvanced, generateTrackingId } from '@/lib/ebay-affiliate'
import { trackEvent } from '@/lib/analytics'
import {
  parsePowerSpec,
  calculatePowerAtImpedance,
  estimatePowerFromImpedance
} from '@/lib/audio-calculations'

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

    // Generate compatibility warnings with power matching analysis
    const newWarnings: CompatibilityWarning[] = []

    // Analyze power matching between headphones and amps
    const allAmps = [...selectedComponents.amps, ...selectedComponents.combos]

    selectedComponents.headphones.forEach(hp => {
      const impedance = hp.impedance ? parseInt(hp.impedance.toString()) : null

      if (!impedance) return

      // Get power requirements for this headphone
      const powerReq = estimatePowerFromImpedance(impedance)
      const powerNeeded = powerReq?.powerNeeded_mW || 50
      const difficulty = powerReq?.difficulty || 'moderate'

      // Check if no amp is selected for demanding headphones
      if (allAmps.length === 0) {
        if (difficulty === 'demanding' || difficulty === 'very_demanding') {
          newWarnings.push({
            type: 'power',
            severity: 'error',
            message: `${hp.name} (${impedance}Ω) requires amplification - needs ~${Math.round(powerNeeded)}mW`,
            components: [hp.name]
          })
        } else if (impedance > 80) {
          newWarnings.push({
            type: 'power',
            severity: 'warning',
            message: `${hp.name} (${impedance}Ω) benefits from dedicated amplification`,
            components: [hp.name]
          })
        }
      } else {
        // Check power adequacy of selected amps
        allAmps.forEach(amp => {
          const ampComponent = amp as Component & { power_output?: string }
          const parsedSpec = parsePowerSpec(ampComponent.power_output)
          let powerAtHeadphoneZ: number

          if (parsedSpec) {
            powerAtHeadphoneZ = calculatePowerAtImpedance(
              parsedSpec.power_mW,
              parsedSpec.reference_impedance,
              impedance
            )
          } else {
            // Estimate based on price tier
            const avgPrice = ((amp.price_used_min || 0) + (amp.price_used_max || 0)) / 2
            if (avgPrice > 500) powerAtHeadphoneZ = 1000
            else if (avgPrice > 300) powerAtHeadphoneZ = 500
            else if (avgPrice > 150) powerAtHeadphoneZ = 250
            else powerAtHeadphoneZ = 100
          }

          const powerRatio = powerAtHeadphoneZ / powerNeeded

          if (powerRatio < 1) {
            newWarnings.push({
              type: 'power',
              severity: 'error',
              message: `${amp.name} may struggle to drive ${hp.name} - only ${Math.round(powerAtHeadphoneZ)}mW at ${impedance}Ω (needs ~${Math.round(powerNeeded)}mW)`,
              components: [amp.name, hp.name]
            })
          } else if (powerRatio < 1.5 && (difficulty === 'demanding' || difficulty === 'very_demanding')) {
            newWarnings.push({
              type: 'power',
              severity: 'warning',
              message: `${amp.name} has limited headroom for ${hp.name} - ${Math.round(powerAtHeadphoneZ)}mW at ${impedance}Ω`,
              components: [amp.name, hp.name]
            })
          } else if (powerRatio >= 2) {
            // Add positive note for good matches
            newWarnings.push({
              type: 'power',
              severity: 'info' as CompatibilityWarning['severity'],
              message: `${amp.name} has excellent headroom for ${hp.name} - ${Math.round(powerAtHeadphoneZ)}mW at ${impedance}Ω (${powerRatio.toFixed(1)}x needed)`,
              components: [amp.name, hp.name]
            })
          }
        })
      }
    })

    // Check for multiple headphones
    if (selectedComponents.headphones.length > 1) {
      newWarnings.push({
        type: 'category',
        severity: 'warning',
        message: 'Multiple headphones selected - consider creating separate stacks',
        components: selectedComponents.headphones.map(hp => hp.name)
      })
    }

    setWarnings(newWarnings)

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
    <div
      className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-[10000] p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.92)' }}
    >
      <div
        className="rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-[10001]"
        style={{
          backgroundColor: 'var(--background-tertiary)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-primary">Build Your Audio Stack</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors text-primary"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stack Overview */}
          <div className="bg-surface-secondary rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Stack Overview</h3>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{formatPrice(totalCost)}</p>
                <p className="text-sm text-secondary">Estimated Total</p>
              </div>
            </div>

            {/* Components List */}
            <div className="space-y-3">
              {finalComponents.map((component) => (
                <div
                  key={component.id}
                  className="flex items-center justify-between bg-surface-secondary p-3 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {getCategoryIcon(component.category)}
                    </span>
                    <div>
                      <p className="font-medium text-primary">{component.name}</p>
                      <p className="text-sm text-secondary">{component.brand} • {component.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-primary">
                      {formatPrice(
                        component.price_used_min && component.price_used_max
                          ? (component.price_used_min + component.price_used_max) / 2
                          : component.price_new || 0
                      )}
                    </span>
                    <button
                      onClick={() => removeComponent(component.id)}
                      className="p-1 text-secondary hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {finalComponents.length === 0 && (
                <div className="text-center py-8 text-secondary">
                  <p className="text-primary">No components selected</p>
                  <p className="text-sm text-secondary">Go back and select some components to build your stack</p>
                </div>
              )}
            </div>
          </div>

          {/* Compatibility Warnings & Power Analysis */}
          {warnings.length > 0 && (
            <div className="space-y-3">
              {/* Errors */}
              {warnings.filter(w => w.severity === 'error').length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Power Issues
                  </h4>
                  <div className="space-y-2">
                    {warnings.filter(w => w.severity === 'error').map((warning, index) => (
                      <div key={index} className="text-sm text-red-700">
                        <p className="font-medium">{warning.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {warnings.filter(w => w.severity === 'warning').length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Compatibility Notes
                  </h4>
                  <div className="space-y-2">
                    {warnings.filter(w => w.severity === 'warning').map((warning, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        <p className="font-medium">{warning.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info (good matches) */}
              {warnings.filter(w => (w.severity as string) === 'info').length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Power Analysis
                  </h4>
                  <div className="space-y-2">
                    {warnings.filter(w => (w.severity as string) === 'info').map((warning, index) => (
                      <div key={index} className="text-sm text-green-700">
                        <p className="font-medium">{warning.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stack Details Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Stack Name
              </label>
              <input
                type="text"
                value={stackName}
                onChange={(e) => setStackName(e.target.value)}
                className="w-full px-3 py-2 border border-border bg-surface-secondary text-primary placeholder-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., Desktop Listening Setup"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Description (Optional)
              </label>
              <textarea
                value={stackDescription}
                onChange={(e) => setStackDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border bg-surface-secondary text-primary placeholder-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Describe your stack, use cases, or notes..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-border bg-surface-secondary">
          <button
            onClick={onClose}
            className="px-4 py-2 text-primary border border-border rounded-lg hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => {
                // Generate eBay search for all components
                const searchTerms = finalComponents
                  .map(c => `${c.brand} ${c.name}`)
                  .join(' OR ')

                const ebayUrl = generateEbayAffiliateLinkAdvanced(
                  searchTerms,
                  {
                    condition: 'used',
                    sortBy: 'best_match',
                    buyItNowOnly: true,
                    customId: generateTrackingId('stack_search', 'recommendations')
                  }
                )

                trackEvent({
                  name: 'stack_ebay_search_clicked',
                  properties: {
                    component_count: finalComponents.length,
                    total_cost: totalCost
                  }
                })

                window.open(ebayUrl, '_blank')
              }}
              disabled={finalComponents.length === 0}
              className="px-4 py-2 text-blue-500 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search All on eBay
            </button>

            <button
              onClick={() => {
                const shareUrl = `${window.location.origin}/recommendations?` +
                  `budget=${Math.round(totalCost)}&` +
                  `components=${finalComponents.map(c => c.id).join(',')}`
                navigator.clipboard.writeText(shareUrl)
                // TODO: Show toast notification
              }}
              className="px-4 py-2 text-orange-500 border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors"
            >
              Share Stack
            </button>

            <button
              onClick={handleSave}
              disabled={!stackName.trim() || finalComponents.length === 0 || saving}
              className="px-6 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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