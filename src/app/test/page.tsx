'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [components, setComponents] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchComponents() {
      const { data, error } = await supabase
        .from('components')
        .select('*')
      
      if (error) {
        setError(error.message)
      } else {
        setComponents(data || [])
      }
      setLoading(false)
    }

    fetchComponents()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8">Error: {error}</div>

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl mb-4">Database Test - Found {components.length} components</h1>
      <pre className="bg-gray-800 p-4 rounded overflow-auto">
        {JSON.stringify(components, null, 2)}
      </pre>
    </div>
  )
}