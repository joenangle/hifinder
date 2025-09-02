'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Component } from '@/types'

function RecommendationsContent() {
  // Separate state for headphones, DACs, amps, and combo units
  const [headphones, setHeadphones] = useState<Component[]>([])
  const [dacs, setDacs] = useState<Component[]>([])
  const [amps, setAmps] = useState<Component[]>([])
  const [dacAmps, setDacAmps] = useState<Component[]>([])
  const [selectedHeadphones, setSelectedHeadphones] = useState<string[]>([])
  const [selectedDacs, setSelectedDacs] = useState<string[]>([])
  const [selectedAmps, setSelectedAmps] = useState<string[]>([])
  const [selectedDacAmps, setSelectedDacAmps] = useState<string[]>([])
  const [showAmplification, setShowAmplification] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const searchParams = useSearchParams()
  const experience = searchParams.get('experience') || 'intermediate'
  const budget = parseInt(searchParams.get('budget') || '300')
  const headphoneType = searchParams.get('headphoneType') || 'cans'
  const existingGearParam = searchParams.get('existingGear') || '{"headphones":false,"dac":false,"amp":false,"combo":false}'
  const existingGear = JSON.parse(existingGearParam)
  const usage = searchParams.get('usage') || 'music'
  const soundSignature = searchParams.get('sound') || 'neutral'

  useEffect(() => {
    const fetchRecommendations = async () => {
      const tier = budget <= 400 ? 'entry' : budget <= 800 ? 'mid' : 'high'
      
      // Limit options based on experience level
      const maxOptions = experience === 'beginner' ? 3 : experience === 'intermediate' ? 5 : 10
      
      // Get matching headphones first - use the selected type (cans or iems)
      const { data: headphones, error: headphonesError } = await supabase
        .from('components')
        .select('*')
        .eq('category', headphoneType)
        .eq('budget_tier', tier)
        .limit(maxOptions)
      
      // Add fallback for headphones if no high-tier found
      let finalHeadphones = headphones || []
      if ((!headphones || headphones.length === 0) && tier === 'high') {
        console.log(`No high-tier ${headphoneType} found, trying mid-tier as fallback`)
        const { data: midHeadphones } = await supabase
          .from('components')
          .select('*')
          .eq('category', headphoneType)
          .eq('budget_tier', 'mid')
          .limit(maxOptions)
        
        if (midHeadphones && midHeadphones.length > 0) {
          console.log(`Found mid-tier ${headphoneType} as fallback:`, midHeadphones.length)
          finalHeadphones = midHeadphones
        }
      }
      
      if (headphonesError) {
        console.error('Headphones query error:', headphonesError)
      }
      
      // Check if any headphones need amplification OR if we're in high budget territory
      const needsAmplification = finalHeadphones?.some(h => h.needs_amp) || budget > 600
      
      // Get amplification components separately - show more options for higher budgets
      const ampLimit = budget > 800 ? 3 : 2
      
      // Debug: Check what categories exist in database
      const { data: allCategories } = await supabase
        .from('components')
        .select('category')
        .not('category', 'is', null)
      
      const uniqueCategories = [...new Set(allCategories?.map(c => c.category) || [])]
      console.log('Available categories in database:', uniqueCategories)
      
      // Fetch separate DACs, amps, and combo units based on budget and strategy
      let finalDacs: Component[] = []
      let finalAmps: Component[] = []
      let finalDacAmps: Component[] = []
      
      if (needsAmplification) {
        // Strategy: For high budgets or enthusiasts, offer separate components
        // For lower budgets or beginners, offer combo units
        const preferSeparates = (budget > 800 && experience === 'enthusiast') || budget > 1000
        
        if (preferSeparates) {
          // Try to get separate DACs and amps
          console.log('Fetching separate DACs and amps for budget:', budget, 'tier:', tier)
          
          const [{ data: dacs }, { data: amps }] = await Promise.all([
            supabase
              .from('components')
              .select('*')
              .eq('category', 'dac')
              .eq('budget_tier', tier)
              .limit(2),
            supabase
              .from('components')
              .select('*')
              .eq('category', 'amp')
              .eq('budget_tier', tier)
              .limit(2)
          ])
          
          finalDacs = dacs || []
          finalAmps = amps || []
        }
        
        // Always get combo units as fallback or primary option
        console.log('Fetching combo DAC/Amps for tier:', tier)
        const { data: dacAmps, error: dacAmpsError } = await supabase
          .from('components')
          .select('*')
          .eq('category', 'dac_amp')
          .eq('budget_tier', tier)
          .limit(ampLimit)
        
        finalDacAmps = dacAmps || []
        
        // Fallback to mid-tier if no high-tier components found
        if (tier === 'high' && finalDacs.length === 0 && finalAmps.length === 0 && finalDacAmps.length === 0) {
          console.log('No high-tier amplification found, trying mid-tier fallback')
          
          const [{ data: midDacs }, { data: midAmps }, { data: midDacAmps }] = await Promise.all([
            supabase.from('components').select('*').eq('category', 'dac').eq('budget_tier', 'mid').limit(2),
            supabase.from('components').select('*').eq('category', 'amp').eq('budget_tier', 'mid').limit(2),
            supabase.from('components').select('*').eq('category', 'dac_amp').eq('budget_tier', 'mid').limit(ampLimit)
          ])
          
          finalDacs = midDacs || []
          finalAmps = midAmps || []
          finalDacAmps = midDacAmps || []
          console.log('Fallback results - DACs:', finalDacs.length, 'Amps:', finalAmps.length, 'Combos:', finalDacAmps.length)
        }
        
        if (dacAmpsError) {
          console.error('DAC/Amp query error:', dacAmpsError)
        }
      }
      
      // Store them separately, not mixed together
      console.log('Budget:', budget, 'Tier:', tier)
      console.log('Fetched headphones:', headphones?.length || 0, 'Final headphones:', finalHeadphones.length)
      console.log('Final DACs:', finalDacs.length, 'Final amps:', finalAmps.length, 'Final combo units:', finalDacAmps.length)
      console.log('needsAmplification calculation:', finalHeadphones?.some(h => h.needs_amp), '|| budget > 600:', budget > 600, '= ', needsAmplification)
      
      setHeadphones(finalHeadphones)
      setDacs(finalDacs)
      setAmps(finalAmps)
      setDacAmps(finalDacAmps)
      setShowAmplification(needsAmplification || false)
      setLoading(false)
    }

    fetchRecommendations()
  }, [budget, headphoneType, existingGear, usage, soundSignature, experience])

  if (loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>

  // Selection handlers
  const toggleHeadphoneSelection = (id: string) => {
    console.log('Toggling headphone:', id)
    setSelectedHeadphones(prev => {
      const newSelection = prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
      console.log('New headphone selection:', newSelection)
      return newSelection
    })
  }

  const toggleDacSelection = (id: string) => {
    setSelectedDacs(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const toggleAmpSelection = (id: string) => {
    setSelectedAmps(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const toggleDacAmpSelection = (id: string) => {
    setSelectedDacAmps(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  // Calculate total price of selected items
  const selectedHeadphoneItems = headphones.filter(h => selectedHeadphones.includes(h.id))
  const selectedDacItems = dacs.filter(d => selectedDacs.includes(d.id))
  const selectedAmpItems = amps.filter(a => selectedAmps.includes(a.id))
  const selectedDacAmpItems = dacAmps.filter(da => selectedDacAmps.includes(da.id))
  
  const totalPrice = selectedHeadphoneItems.reduce((sum, item) => sum + (item.price_used_min || 0), 0) +
                    selectedDacItems.reduce((sum, item) => sum + (item.price_used_min || 0), 0) +
                    selectedAmpItems.reduce((sum, item) => sum + (item.price_used_min || 0), 0) +
                    selectedDacAmpItems.reduce((sum, item) => sum + (item.price_used_min || 0), 0)
  
  // Experience-based content adaptation
  const getDescription = (component: Component) => {
    if (experience === 'beginner') {
      // Simplify technical jargon
      return component.why_recommended?.replace(/impedance|ohm/gi, 'power requirement')
        .replace(/frequency response/gi, 'sound quality')
        .replace(/THD\+N/gi, 'distortion') || component.why_recommended
    } else if (experience === 'enthusiast') {
      // Add more technical details if available
      return component.why_recommended
    }
    return component.why_recommended
  }

  const shouldShowTechnicalSpecs = () => experience !== 'beginner'

  const getExperienceBasedTitle = () => {
    switch (experience) {
      case 'beginner': return 'Perfect starter gear for you'
      case 'intermediate': return 'Great upgrade options'
      case 'enthusiast': return 'Audiophile recommendations'
      default: return 'Your Recommendations'
    }
  }

  // Budget visualization
  const budgetDiff = budget - totalPrice
  const getBudgetGradient = () => {
    if (Math.abs(budgetDiff) <= 100) {
      if (budgetDiff >= 0) {
        const intensity = Math.max(0, (100 - budgetDiff) / 100)
        return `linear-gradient(90deg, rgba(34, 197, 94, ${0.1 + intensity * 0.2}) 0%, rgba(34, 197, 94, 0.1) 100%)`
      } else {
        const intensity = Math.min(1, Math.abs(budgetDiff) / 100)
        return `linear-gradient(90deg, rgba(239, 68, 68, ${0.1 + intensity * 0.2}) 0%, rgba(239, 68, 68, 0.1) 100%)`
      }
    }
    return budgetDiff > 100 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.3)'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Home Link */}
        <div className="mb-6">
          <Link href="/" className="text-gray-400 hover:text-white inline-flex items-center gap-2 text-sm">
            ← Back to Home
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-2">{getExperienceBasedTitle()}</h1>
        <p className="text-gray-400 mb-2">Based on your ${budget} budget</p>
        {experience === 'beginner' && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
            <p className="text-blue-200 text-sm">
              💡 <strong>New to audio?</strong> We&apos;ve selected simple, great-sounding options and explained everything in plain language. 
              <span className="block mt-2">Need help? Check out our <a href="/learn" className="text-blue-400 hover:text-blue-300">Learning section</a> for basics.</span>
            </p>
          </div>
        )}

        <div className="space-y-4 mb-8">
          <h2 className="text-2xl font-bold mb-2">
            {headphoneType === 'cans' ? '🎧 Over/On-Ear Headphones' : '🎵 In-Ear Monitors'}
          </h2>
        {headphones.map((component) => {
            const isSelected = selectedHeadphones.includes(component.id)
            return (
              <div 
                key={component.id} 
                className={`rounded-lg p-6 cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-blue-900/50 border-2 border-blue-500 ring-1 ring-blue-400' 
                    : 'bg-gray-800 hover:bg-gray-750 border-2 border-transparent'
                }`}
                onClick={() => toggleHeadphoneSelection(component.id)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded border-2 mt-1 flex items-center justify-center ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-500'
                    }`}>
                      {isSelected && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{component.name}</h3>
                      <p className="text-gray-400">{component.brand}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-1 rounded">
                          {component.sound_signature} sound
                        </span>
                        <span className="text-xs bg-green-600/30 text-green-300 px-2 py-1 rounded">
                          {component.budget_tier} tier
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">${component.price_used_min}</p>
                    <p className="text-sm text-gray-400">Used price</p>
                  </div>
                </div>
                <p className="text-gray-300 mt-3 ml-8">{getDescription(component)}</p>
                {shouldShowTechnicalSpecs() && component.impedance && (
                  <div className="ml-8 mt-2 text-sm text-gray-500">
                    <span>Impedance: {component.impedance}Ω</span>
                    {component.needs_amp && <span className="ml-4">Amplifier recommended</span>}
                  </div>
                )}
                {component.needs_amp && (
                  <p className="text-yellow-400 text-sm mt-2 ml-8">
                    {experience === 'beginner' ? '⚡ Needs extra power (amplifier)' : '⚡ Requires amplifier'}
                  </p>
                )}
              </div>
            )
          })}

        {showAmplification && (dacs.length > 0 || amps.length > 0 || dacAmps.length > 0) && (
            <>
            <h2 className="text-2xl font-bold mt-8 mb-2">
              Amplification 
              {experience === 'beginner' && <span className="text-base text-gray-400 font-normal ml-2">(Power sources for your headphones)</span>}
            </h2>
            {budget > 600 && (
              <p className="text-gray-400 text-sm mb-4">
                💡 At this budget level, dedicated amplification will help you get the most out of high-end headphones
              </p>
            )}
            
            {/* Separate DACs */}
            {dacs.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-purple-300">🔄 Digital-to-Analog Converters (DACs)</h3>
                {dacs.map((component) => {
                  const isSelected = selectedDacs.includes(component.id)
                  return (
                    <div 
                      key={component.id} 
                      className={`rounded-lg p-6 cursor-pointer transition-all mb-3 ${
                        isSelected 
                          ? 'bg-purple-900/50 border-2 border-purple-500 ring-1 ring-purple-400' 
                          : 'bg-gray-800 hover:bg-gray-750 border-2 border-transparent'
                      }`}
                      onClick={() => toggleDacSelection(component.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded border-2 mt-1 flex items-center justify-center ${
                            isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-500'
                          }`}>
                            {isSelected && <span className="text-white text-xs">✓</span>}
                          </div>
                          <div>
                            <h4 className="text-xl font-semibold">{component.name}</h4>
                            <p className="text-gray-400">{component.brand}</p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-1 rounded">
                                DAC
                              </span>
                              <span className="text-xs bg-green-600/30 text-green-300 px-2 py-1 rounded">
                                {component.budget_tier} tier
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">${component.price_used_min}</p>
                          <p className="text-sm text-gray-400">Used price</p>
                        </div>
                      </div>
                      <p className="text-gray-300 mt-3 ml-8">{getDescription(component)}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Separate Amps */}
            {amps.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-orange-300">⚡ Headphone Amplifiers</h3>
                {amps.map((component) => {
                  const isSelected = selectedAmps.includes(component.id)
                  return (
                    <div 
                      key={component.id} 
                      className={`rounded-lg p-6 cursor-pointer transition-all mb-3 ${
                        isSelected 
                          ? 'bg-orange-900/50 border-2 border-orange-500 ring-1 ring-orange-400' 
                          : 'bg-gray-800 hover:bg-gray-750 border-2 border-transparent'
                      }`}
                      onClick={() => toggleAmpSelection(component.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded border-2 mt-1 flex items-center justify-center ${
                            isSelected ? 'bg-orange-600 border-orange-600' : 'border-gray-500'
                          }`}>
                            {isSelected && <span className="text-white text-xs">✓</span>}
                          </div>
                          <div>
                            <h4 className="text-xl font-semibold">{component.name}</h4>
                            <p className="text-gray-400">{component.brand}</p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-xs bg-orange-600/30 text-orange-300 px-2 py-1 rounded">
                                Amp
                              </span>
                              <span className="text-xs bg-green-600/30 text-green-300 px-2 py-1 rounded">
                                {component.budget_tier} tier
                              </span>
                              {component.power_output && (
                                <span className="text-xs bg-gray-600/30 text-gray-300 px-2 py-1 rounded">
                                  {component.power_output}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">${component.price_used_min}</p>
                          <p className="text-sm text-gray-400">Used price</p>
                        </div>
                      </div>
                      <p className="text-gray-300 mt-3 ml-8">{getDescription(component)}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Combo DAC/Amp Units */}
            {dacAmps.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-blue-300">🎯 All-in-One DAC/Amp Units</h3>
                {dacAmps.map((component) => {
                  const isSelected = selectedDacAmps.includes(component.id)
                  return (
                    <div 
                      key={component.id} 
                      className={`rounded-lg p-6 cursor-pointer transition-all mb-3 ${
                        isSelected 
                          ? 'bg-blue-900/50 border-2 border-blue-500 ring-1 ring-blue-400' 
                          : 'bg-gray-800 hover:bg-gray-750 border-2 border-transparent'
                      }`}
                      onClick={() => toggleDacAmpSelection(component.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded border-2 mt-1 flex items-center justify-center ${
                            isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-500'
                          }`}>
                            {isSelected && <span className="text-white text-xs">✓</span>}
                          </div>
                          <div>
                            <h4 className="text-xl font-semibold">{component.name}</h4>
                            <p className="text-gray-400">{component.brand}</p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-1 rounded">
                                {component.sound_signature} sound
                              </span>
                              <span className="text-xs bg-green-600/30 text-green-300 px-2 py-1 rounded">
                                {component.budget_tier} tier
                              </span>
                              {component.power_output && (
                                <span className="text-xs bg-gray-600/30 text-gray-300 px-2 py-1 rounded">
                                  {component.power_output}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">${component.price_used_min}</p>
                          <p className="text-sm text-gray-400">Used price</p>
                        </div>
                      </div>
                      <p className="text-gray-300 mt-3 ml-8">{getDescription(component)}</p>
                    </div>
                  )
                })}
              </div>
            )}
            </>
        )}
        </div>

        {/* Budget Summary with Selection */}
        <div 
          className="border rounded-lg p-6 mb-8 transition-all"
          style={{ 
            background: getBudgetGradient(),
            borderColor: budgetDiff >= -100 ? (budgetDiff >= 0 ? '#10b981' : '#ef4444') : '#ef4444'
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-xl font-bold">Your Selection</h3>
              <p className="text-sm text-gray-400">
                {selectedHeadphones.length + selectedDacs.length + selectedAmps.length + selectedDacAmps.length} items selected
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${totalPrice}</p>
              <p className={`text-sm ${budgetDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {budgetDiff >= 0 ? `$${budgetDiff} under budget` : `$${Math.abs(budgetDiff)} over budget`}
              </p>
            </div>
          </div>
          
          {(selectedHeadphones.length > 0 || selectedDacs.length > 0 || selectedAmps.length > 0 || selectedDacAmps.length > 0) && (
            <div className="space-y-2">
              {selectedHeadphoneItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm bg-black/20 rounded p-2">
                  <span>🎧 {item.name}</span>
                  <span>${item.price_used_min}</span>
                </div>
              ))}
              {selectedDacItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm bg-black/20 rounded p-2">
                  <span>🔄 {item.name}</span>
                  <span>${item.price_used_min}</span>
                </div>
              ))}
              {selectedAmpItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm bg-black/20 rounded p-2">
                  <span>⚡ {item.name}</span>
                  <span>${item.price_used_min}</span>
                </div>
              ))}
              {selectedDacAmpItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm bg-black/20 rounded p-2">
                  <span>🎯 {item.name}</span>
                  <span>${item.price_used_min}</span>
                </div>
              ))}
            </div>
          )}
          
          {selectedHeadphones.length + selectedDacs.length + selectedAmps.length + selectedDacAmps.length === 0 && (
            <p className="text-gray-400 text-center py-4">Select items above to see your total</p>
          )}
        </div>

        <div className="flex gap-4">
          {(selectedHeadphones.length + selectedDacs.length + selectedAmps.length + selectedDacAmps.length) >= 2 && (
            <button 
              onClick={() => {
                // Future: Navigate to comparison page with selected items
                console.log('Compare selected:', { selectedHeadphones, selectedDacs, selectedAmps, selectedDacAmps })
              }}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium"
            >
              Compare Selected ({selectedHeadphones.length + selectedDacs.length + selectedAmps.length + selectedDacAmps.length})
            </button>
          )}
          
          <Link 
            href="/"
            className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg inline-block"
          >
            Start Over
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>}>
      <RecommendationsContent />
    </Suspense>
  )
}