'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Component } from '@/types'

function RecommendationsContent() {
  const [components, setComponents] = useState<Component[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const budget = parseInt(searchParams.get('budget') || '300')
  const usage = searchParams.get('usage') || 'music'
  const soundSignature = searchParams.get('sound') || 'neutral'

  useEffect(() => {
    const fetchRecommendations = async () => {
      const tier = budget < 300 ? 'entry' : budget < 600 ? 'mid' : 'high'
      
      // Get headphones that match preferences
      const { data: headphones } = await supabase
        .from('components')
        .select('*')
        .eq('category', 'headphones')
        .eq('budget_tier', tier)
        .eq('sound_signature', soundSignature)
        .contains('use_cases', [usage])
        .limit(2)
      
      // Get appropriate amp if needed
      const needsAmp = headphones?.some(h => h.needs_amp)
      let amp = null
      
      if (needsAmp) {
        const { data: amps } = await supabase
          .from('components')
          .select('*')
          .eq('category', 'dac_amp')
          .eq('budget_tier', tier)
          .limit(1)
        
        amp = amps?.[0]
      }
      
      const allComponents = [...(headphones || []), ...(amp ? [amp] : [])]
      setComponents(allComponents)
      setLoading(false)
    }

    fetchRecommendations()
  }, [budget, usage, soundSignature])

  if (loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>

  const totalPrice = components.reduce((sum, c) => sum + (c.price_used_min || 0), 0)

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Your Recommendations</h1>
        <p className="text-gray-400 mb-8">Based on your ${budget} budget</p>

        <div className="space-y-4 mb-8">
          {components.map((component) => (
            <div key={component.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-xl font-semibold">{component.name}</h3>
                  <p className="text-gray-400">{component.brand}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">${component.price_used_min}</p>
                  <p className="text-sm text-gray-400">Used price</p>
                  <p className="text-gray-400">{component.brand}</p>
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
        </div>

        <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4 mb-8">
          <div className="flex justify-between text-lg">
            <span>Total (used prices):</span>
            <span className="font-bold">${totalPrice}</span>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Budget remaining: ${budget - totalPrice}
          </div>
        </div>

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