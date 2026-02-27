'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Clock, X } from 'lucide-react'
import { getSavedSearches, clearSavedSearches, SavedSearch } from '@/lib/saved-searches'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)

const formatRelativeTime = (ts: number) => {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}

export function RecentSearches() {
  const [searches, setSearches] = useState<SavedSearch[]>([])

  useEffect(() => {
    setSearches(getSavedSearches())
  }, [])

  if (searches.length === 0) return null

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Recent Searches</h3>
        <button
          onClick={() => {
            clearSavedSearches()
            setSearches([])
          }}
          className="text-xs text-muted hover:text-foreground transition-colors"
        >
          Clear all
        </button>
      </div>
      <div className="space-y-1">
        {searches.map((search, i) => (
          <Link
            key={i}
            href={search.url}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-accent/10 text-accent">
              <Search className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium">
                {formatCurrency(search.budget)} budget
              </p>
              <p className="text-xs text-muted truncate">{search.filters}</p>
            </div>
            <span className="text-xs text-muted flex-shrink-0 tabular-nums">
              {formatRelativeTime(search.timestamp)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
