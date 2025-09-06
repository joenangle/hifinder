'use client'

import { Search } from 'lucide-react'
import Link from 'next/link'

interface FindUsedButtonProps {
  componentId: string
  componentName?: string
  brand?: string
  className?: string
  showText?: boolean
}

export function FindUsedButton({ 
  componentId: _componentId, // Prefixed with underscore to indicate intentionally unused
  componentName, 
  brand, 
  className = '',
  showText = false 
}: FindUsedButtonProps) {
  // Create search parameters to pre-filter the used market
  const searchParams = new URLSearchParams()
  
  if (componentName && brand) {
    searchParams.set('search', `${brand} ${componentName}`)
  }
  
  const href = `/used-market?${searchParams.toString()}`

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-md font-medium transition-colors ${className}`}
    >
      <Search className="w-4 h-4" />
      {showText && <span>Find Used</span>}
    </Link>
  )
}