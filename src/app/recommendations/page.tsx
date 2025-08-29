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

  useEffect(() => {
    const fetchRecommendations = async () => {
      const tier = budget < 300 ? 'entry' : budget < 600 ? 'mid' : 'high'
      
      const { data, error } = await supabase
        .from('components')
        .select('*')
        .eq('budget_tier', tier)
      
      if (!error && data) {
        setComponents(data)
      }
      setLoading(false)
    }

    fetchRecommendations()
  }, [budget])

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