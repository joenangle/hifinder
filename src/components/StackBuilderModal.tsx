'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
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
  ownedComponents?: {
    headphones: Component[]
    dacs: Component[]
    amps: Component[]
    combos: Component[]
  }
  onRemoveComponent?: (componentId: string, category: string) => void
  onRemoveOwnedComponent?: (id: string) => void
  onSaveStack?: (stackName: string, components: Component[]) => void
}

interface StackComponent extends Component {
  stackPosition: 'source' | 'dac' | 'amp' | 'headphones'
}

export function StackBuilderModal({
  isOpen,
  onClose,
  selectedComponents,
  ownedComponents,
  onRemoveComponent,
  onRemoveOwnedComponent,
  onSaveStack
}: StackBuilderModalProps) {
  const { data: session } = useSession()
  const [stackName, setStackName] = useState('')
  const [stackDescription, setStackDescription] = useState('')
  const [finalComponents, setFinalComponents] = useState<StackComponent[]>([])
  const [warnings, setWarnings] = useState<CompatibilityWarning[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // Track which IDs are owned for cost exclusion and display
  const ownedIds = new Set([
    ...(ownedComponents?.headphones || []).map(c => c.id),
    ...(ownedComponents?.dacs || []).map(c => c.id),
    ...(ownedComponents?.amps || []).map(c => c.id),
    ...(ownedComponents?.combos || []).map(c => c.id),
  ])

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

    // Add owned components (they're in the stack but won't count toward cost)
    ownedComponents?.headphones.forEach(hp => {
      components.push({ ...hp, stackPosition: 'headphones' })
    })
    ownedComponents?.dacs.forEach(dac => {
      components.push({ ...dac, stackPosition: 'dac' })
    })
    ownedComponents?.amps.forEach(amp => {
      components.push({ ...amp, stackPosition: 'amp' })
    })
    ownedComponents?.combos.forEach(combo => {
      components.push({ ...combo, stackPosition: 'dac' })
    })

    setFinalComponents(components)
    setSaveError(null)
    setSaveSuccess(false)
    setShowLoginPrompt(false)

    // Generate compatibility warnings with power matching analysis
    const newWarnings: CompatibilityWarning[] = []

    // Analyze power matching — include BOTH selected and owned amps/headphones
    const allHeadphones = [...selectedComponents.headphones, ...(ownedComponents?.headphones || [])]
    const allAmps = [...selectedComponents.amps, ...selectedComponents.combos, ...(ownedComponents?.amps || []), ...(ownedComponents?.combos || [])]

    allHeadphones.forEach(hp => {
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
    const totalHp = selectedComponents.headphones.length + (ownedComponents?.headphones.length || 0)
    const totalDacs = selectedComponents.dacs.length + (ownedComponents?.dacs.length || 0)
    const totalAmps = selectedComponents.amps.length + (ownedComponents?.amps.length || 0)
    const totalCombos = selectedComponents.combos.length + (ownedComponents?.combos.length || 0)
    if (totalHp > 0) types.push('Headphones')
    if (totalDacs > 0) types.push('DAC')
    if (totalAmps > 0) types.push('Amp')
    if (totalCombos > 0) types.push('DAC/Amp')

    const autoName = types.length > 0 ? `${types.join(' + ')} Stack` : 'My Audio Stack'
    setStackName(autoName)
  }, [isOpen, selectedComponents, ownedComponents])

  // Calculate total cost — exclude owned gear
  const totalCost = finalComponents
    .filter(c => !ownedIds.has(c.id))
    .reduce((sum, component) => {
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

  // Handle save with auth check
  const handleSave = async () => {
    if (!stackName.trim() || finalComponents.length === 0) return

    // Check auth - show login prompt if not authenticated
    if (!session?.user) {
      setShowLoginPrompt(true)
      return
    }

    setSaving(true)
    setSaveError(null)

    try {
      const response = await fetch('/api/stacks/from-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: stackName.trim(),
          description: stackDescription.trim() || null,
          componentIds: finalComponents.filter(c => !ownedIds.has(c.id)).map(c => c.id),
          ownedComponentIds: finalComponents.filter(c => ownedIds.has(c.id)).map(c => c.id)
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Failed to save stack (${response.status})`)
      }

      setSaveSuccess(true)

      trackEvent({
        name: 'stack_saved_from_recommendations',
        properties: {
          component_count: finalComponents.length,
          total_cost: totalCost,
          stack_name: stackName
        }
      })

      // Auto-close after brief success message
      setTimeout(() => {
        if (onSaveStack) {
          onSaveStack(stackName, finalComponents)
        }
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Failed to save stack:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save stack')
    } finally {
      setSaving(false)
    }
  }

  // Remove component and sync to parent
  const removeComponent = (componentId: string) => {
    setFinalComponents(prev => prev.filter(c => c.id !== componentId))

    // Route to appropriate parent handler
    if (ownedIds.has(componentId)) {
      onRemoveOwnedComponent?.(componentId)
    } else {
      const component = finalComponents.find(c => c.id === componentId)
      if (component && onRemoveComponent) {
        const categoryMap: Record<string, string> = {
          'cans': 'cans',
          'iems': 'iems',
          'dac': 'dacs',
          'amp': 'amps',
          'dac_amp': 'combos',
          'cable': 'combos'
        }
        onRemoveComponent(componentId, categoryMap[component.category] || 'combos')
      }
    }
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
      role="dialog"
      aria-modal="true"
      aria-label="Build Your Audio Stack"
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
          {/* Login Prompt Banner */}
          {showLoginPrompt && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Sign in to save your stack</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">Your stack will be saved to your account so you can access it anytime.</p>
                </div>
                <button
                  onClick={() => signIn('google')}
                  className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Sign In with Google
                </button>
              </div>
            </div>
          )}

          {/* Save Success Banner */}
          {saveSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="font-medium text-green-800 dark:text-green-200">Stack saved successfully!</p>
              </div>
            </div>
          )}

          {/* Save Error Banner */}
          {saveError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-300">{saveError}</p>
              </div>
            </div>
          )}

          {/* Stack Overview */}
          <div className="bg-surface-secondary rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Stack Overview</h3>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{formatPrice(totalCost)}</p>
                <p className="text-sm text-secondary">
                  {ownedIds.size > 0 ? 'Est. Total (excl. owned)' : 'Estimated Total'}
                </p>
              </div>
            </div>

            {/* Components List */}
            <div className="space-y-3">
              {finalComponents.map((component) => {
                const isOwned = ownedIds.has(component.id)
                return (
                  <div
                    key={component.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isOwned
                        ? 'border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10'
                        : 'border-border bg-surface-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {getCategoryIcon(component.category)}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-primary">{component.brand} {component.name}</p>
                          {isOwned && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                              Owned
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-secondary">{component.category === 'dac_amp' ? 'DAC/Amp' : component.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {isOwned ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">No cost</span>
                      ) : (
                        <span className="text-sm font-medium text-primary">
                          {formatPrice(
                            component.price_used_min && component.price_used_max
                              ? (component.price_used_min + component.price_used_max) / 2
                              : component.price_new || 0
                          )}
                        </span>
                      )}
                      <button
                        onClick={() => removeComponent(component.id)}
                        className="p-1 text-secondary hover:text-red-500 transition-colors"
                        aria-label={`Remove ${component.brand} ${component.name}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}

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
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Power Issues
                  </h4>
                  <div className="space-y-2">
                    {warnings.filter(w => w.severity === 'error').map((warning, index) => (
                      <div key={index} className="text-sm text-red-700 dark:text-red-300">
                        <p className="font-medium">{warning.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {warnings.filter(w => w.severity === 'warning').length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Compatibility Notes
                  </h4>
                  <div className="space-y-2">
                    {warnings.filter(w => w.severity === 'warning').map((warning, index) => (
                      <div key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                        <p className="font-medium">{warning.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info (good matches) */}
              {warnings.filter(w => (w.severity as string) === 'info').length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Power Analysis
                  </h4>
                  <div className="space-y-2">
                    {warnings.filter(w => (w.severity as string) === 'info').map((warning, index) => (
                      <div key={index} className="text-sm text-green-700 dark:text-green-300">
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
                // Generate eBay search for to-purchase components only (exclude owned)
                const searchTerms = finalComponents
                  .filter(c => !ownedIds.has(c.id))
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
              className="px-4 py-2 text-blue-500 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search All on eBay
            </button>

            <button
              onClick={() => {
                const shareUrl = `${window.location.origin}/recommendations?` +
                  `budget=${Math.round(totalCost)}&` +
                  `components=${finalComponents.map(c => c.id).join(',')}`
                navigator.clipboard.writeText(shareUrl)
              }}
              className="px-4 py-2 text-orange-500 dark:text-orange-400 border border-orange-300 dark:border-orange-700 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"
            >
              Share Stack
            </button>

            <button
              onClick={handleSave}
              disabled={!stackName.trim() || finalComponents.length === 0 || saving || saveSuccess}
              className="px-6 py-2 bg-orange-400 text-white rounded-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {saving && (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {saveSuccess ? 'Saved!' : session ? 'Save Stack' : 'Sign In & Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
