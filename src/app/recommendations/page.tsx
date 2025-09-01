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
  const [selectedHeadphone, setSelectedHeadphone] = useState<string | null>(null)
  const [selectedAmp, setSelectedAmp] = useState<string | null>(null)
  const [showAmps, setShowAmps] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const searchParams = useSearchParams()
  const budget = parseInt(searchParams.get('budget') || '300')
  const usage = searchParams.get('usage') || 'music'
  const soundSignature = searchParams.get('sound') || 'neutral'

  // Then your useEffect with the fetch logic...

useEffect(() => {
  const fetchRecommendations = async () => {
    const tier = budget < 300 ? 'entry' : budget < 600 ? 'mid' : 'high'
    
    // Get matching headphones first
    const { data: headphones } = await supabase
      .from('components')
      .select('*')
      .eq('category', 'headphones')
      .eq('budget_tier', tier)
      .limit(3)  // Show top 3 headphone options
    
    // Check if any selected headphones need an amp
    const needsAmp = headphones?.some(h => h.needs_amp)
    
    // Get DAC/Amps separately
    const { data: amps } = await supabase
      .from('components')
      .select('*')
      .eq('category', 'dac_amp')
      .eq('budget_tier', tier)
      .limit(2)  // Show 2 amp options
    
    // Store them separately, not mixed together
    setHeadphones(headphones || [])
    setAmps(amps || [])
    setShowAmps(needsAmp || false)
    setLoading(false)
  }

  fetchRecommendations()
}, [budget, usage, soundSignature])

  if (loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>

    // Calculate price based on selected items only
    const getSelectedHeadphonePrice = () => {
    const selected = headphones.find(h => h.id === selectedHeadphone)
    return selected?.price_used_min || 0
    }

    const getSelectedAmpPrice = () => {
    const selected = amps.find(a => a.id === selectedAmp)
    return selected?.price_used_min || 0
    }

    const totalPrice = getSelectedHeadphonePrice() + getSelectedAmpPrice()

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Your Recommendations</h1>
        <p className="text-gray-400 mb-8">Based on your ${budget} budget</p>

        // ...existing code...
        <div className="space-y-4 mb-8">
        <h2 className="text-2xl font-bold mb-2">Headphones</h2>
        {headphones.map((component) => (
            <div key={component.id} className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-start mb-2">
                <div>
                <h3 className="text-xl font-semibold">{component.name}</h3>
                <p className="text-gray-400">{component.brand}</p>
                </div>
                <div className="text-right">
                <p className="text-lg font-bold">${component.price_used_min}</p>
                <p className="text-sm text-gray-400">Used price</p>
                </div>
                <div className="flex gap-2 mt-2">
                <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-1 rounded">
                    {component.sound_signature} sound
                </span>
                <span className="text-xs bg-green-600/30 text-green-300 px-2 py-1 rounded">
                    {component.budget_tier} tier
                </span>
                </div>
            </div>
            <p className="text-gray-300 mt-3">{component.why_recommended}</p>
            {component.needs_amp && (
                <p className="text-yellow-400 text-sm mt-2">⚡ Requires amplifier</p>
            )}
            </div>
        ))}

        {showAmps && amps.length > 0 && (
            <>
            <h2 className="text-2xl font-bold mt-8 mb-2">DAC/Amps</h2>
            {amps.map((component) => (
                <div key={component.id} className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-start mb-2">
                    <div>
                    <h3 className="text-xl font-semibold">{component.name}</h3>
                    <p className="text-gray-400">{component.brand}</p>
                    </div>
                    <div className="text-right">
                    <p className="text-lg font-bold">${component.price_used_min}</p>
                    <p className="text-sm text-gray-400">Used price</p>
                    </div>
                    <div className="flex gap-2 mt-2">
                    <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-1 rounded">
                        {component.sound_signature} sound
                    </span>
                    <span className="text-xs bg-green-600/30 text-green-300 px-2 py-1 rounded">
                        {component.budget_tier} tier
                    </span>
                    </div>
                </div>
                <p className="text-gray-300 mt-3">{component.why_recommended}</p>
                </div>
            ))}
            </>
        )}
        </div>
        // ...existing code...

        // Show total only if items are selected.     
        {(selectedHeadphone || selectedAmp) && (
        <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4 mb-8">
            <div className="flex justify-between text-lg">
            <span>Total (used prices):</span>
            <span className="font-bold">${totalPrice}</span>
            </div>
            <div className="text-sm text-gray-400 mt-1">
            Budget remaining: ${budget - totalPrice}
            </div>
        </div>
        )}

        <Link 
          href="/"
          className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg inline-block"
        >
          Start Over
        </Link>
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