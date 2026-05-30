'use client'

import { Search } from 'lucide-react'
import Link from 'next/link'

interface FindUsedButtonProps {
  componentId: string
  componentName?: string
  brand?: string
  className?: string
  showText?: boolean
  /** Number of active used listings; when provided (>0) it's shown as a badge. */
  listingCount?: number
}

export function FindUsedButton({
  componentId: _componentId, // Prefixed with underscore to indicate intentionally unused
  componentName,
  brand,
  className = '',
  showText = false,
  listingCount,
}: FindUsedButtonProps) {
  // Create search parameters to pre-filter the used market
  const searchParams = new URLSearchParams()

  if (componentName && brand) {
    searchParams.set('search', `${brand} ${componentName}`)
  }

  const href = `/marketplace?${searchParams.toString()}`
  const hasCount = typeof listingCount === 'number' && listingCount > 0
  const label = hasCount ? `Find Used · ${listingCount}` : 'Find Used'

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-md font-medium transition-colors ${className}`}
    >
      <Search className="w-4 h-4" />
      {showText && <span>{label}</span>}
    </Link>
  )
}