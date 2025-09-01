'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Component } from '@/types'

function RecommendationsContent() {
  // Separate state for headphones and amps
  const [headphones, setHeadphones] = useState<Component[]>([])
  const [amps, setAmps] = useState<Component[]>([])
  const [selectedHeadphones, setSelectedHeadphones] = useState<string[]>([])
  const [selectedAmps, setSelectedAmps] = useState<string[]>([])
  const [showAmps, setShowAmps] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const searchParams = useSearchParams()
  const budget = parseInt(searchParams.get('budget') || '300')
  const usage = searchParams.get('usage') || 'music'
  const soundSignature = searchParams.get('sound') || 'neutral'

  useEffect(() => {
    const fetchRecommendations = async () => {
      const tier = budget <= 300 ? 'entry' : budget <= 600 ? 'mid' : 'high'
      
      // Get matching headphones first
      const { data: headphones, error: headphonesError } = await supabase
        .from('components')
        .select('*')
        .eq('category', 'headphones')
        .eq('budget_tier', tier)
        .limit(3)  // Show top 3 headphone options
      
      if (headphonesError) {
        console.error('Headphones query error:', headphonesError)
      }
      
      // Check if any selected headphones need an amp
      const needsAmp = headphones?.some(h => h.needs_amp)
      
      // Get DAC/Amps separately
      const { data: amps, error: ampsError } = await supabase
        .from('components')
        .select('*')
        .eq('category', 'dac_amp')
        .eq('budget_tier', tier)
        .limit(2)  // Show 2 amp options
        
      if (ampsError) {
        console.error('Amps query error:', ampsError)
      }
      
      // Store them separately, not mixed together
      console.log('Fetched headphones:', headphones)
      console.log('Fetched amps:', amps)
      setHeadphones(headphones || [])
      setAmps(amps || [])
      setShowAmps(needsAmp || false)
      setLoading(false)
    }

    fetchRecommendations()
  }, [budget, usage, soundSignature])

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

  const toggleAmpSelection = (id: string) => {
    setSelectedAmps(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  // Calculate total price of selected items
  const selectedHeadphoneItems = headphones.filter(h => selectedHeadphones.includes(h.id))
  const selectedAmpItems = amps.filter(a => selectedAmps.includes(a.id))
  const totalPrice = selectedHeadphoneItems.reduce((sum, item) => sum + (item.price_used_min || 0), 0) +
                    selectedAmpItems.reduce((sum, item) => sum + (item.price_used_min || 0), 0)
  
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
        <h1 className="text-3xl font-bold mb-2">Your Recommendations</h1>
        <p className="text-gray-400 mb-8">Based on your ${budget} budget</p>

        <div className="space-y-4 mb-8">
          <h2 className="text-2xl font-bold mb-2">Headphones</h2>
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
                <p className="text-gray-300 mt-3 ml-8">{component.why_recommended}</p>
                {component.needs_amp && (
                  <p className="text-yellow-400 text-sm mt-2 ml-8">⚡ Requires amplifier</p>
                )}
              </div>
            )
          })}

        {showAmps && amps.length > 0 && (
            <>
            <h2 className="text-2xl font-bold mt-8 mb-2">DAC/Amps</h2>
            {amps.map((component) => {
              const isSelected = selectedAmps.includes(component.id)
              return (
                <div 
                  key={component.id} 
                  className={`rounded-lg p-6 cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-blue-900/50 border-2 border-blue-500 ring-1 ring-blue-400' 
                      : 'bg-gray-800 hover:bg-gray-750 border-2 border-transparent'
                  }`}
                  onClick={() => toggleAmpSelection(component.id)}
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
                  <p className="text-gray-300 mt-3 ml-8">{component.why_recommended}</p>
                </div>
              )
            })}
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
                {selectedHeadphones.length + selectedAmps.length} items selected
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">${totalPrice}</p>
              <p className={`text-sm ${budgetDiff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {budgetDiff >= 0 ? `$${budgetDiff} under budget` : `$${Math.abs(budgetDiff)} over budget`}
              </p>
            </div>
          </div>
          
          {(selectedHeadphones.length > 0 || selectedAmps.length > 0) && (
            <div className="space-y-2">
              {selectedHeadphoneItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm bg-black/20 rounded p-2">
                  <span>{item.name}</span>
                  <span>${item.price_used_min}</span>
                </div>
              ))}
              {selectedAmpItems.map(item => (
                <div key={item.id} className="flex justify-between text-sm bg-black/20 rounded p-2">
                  <span>{item.name}</span>
                  <span>${item.price_used_min}</span>
                </div>
              ))}
            </div>
          )}
          
          {selectedHeadphones.length + selectedAmps.length === 0 && (
            <p className="text-gray-400 text-center py-4">Select items above to see your total</p>
          )}
        </div>

        <div className="flex gap-4">
          {(selectedHeadphones.length + selectedAmps.length) >= 2 && (
            <button 
              onClick={() => {
                // Future: Navigate to comparison page with selected items
                console.log('Compare selected:', { selectedHeadphones, selectedAmps })
              }}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium"
            >
              Compare Selected ({selectedHeadphones.length + selectedAmps.length})
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