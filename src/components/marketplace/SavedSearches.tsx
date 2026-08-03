'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Bookmark, Plus, X } from 'lucide-react'

interface SavedSearch {
  id: string
  name: string
  query_string: string
}

interface SavedSearchesProps {
  /** Serialized current marketplace filters (from serializeMarketplaceParams). */
  currentQuery: string
}

export function SavedSearches({ currentQuery }: SavedSearchesProps) {
  const { status } = useSession()
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    fetch('/api/saved-searches', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setSearches(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [status])

  if (status !== 'authenticated') return null

  async function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: trimmed, queryString: currentQuery }),
      })
      if (res.ok) {
        const created = await res.json()
        setSearches((prev) => [created, ...prev])
        setName('')
        setAdding(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setSearches((prev) => prev.filter((s) => s.id !== id))
    await fetch(`/api/saved-searches?id=${id}`, { method: 'DELETE', credentials: 'include' }).catch(
      () => {}
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs text-muted">
        <Bookmark className="w-3.5 h-3.5" /> Saved:
      </span>

      {searches.length === 0 && !adding && (
        <span className="text-xs text-muted">none yet</span>
      )}

      {searches.map((s) => (
        <span
          key={s.id}
          className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-surface-secondary text-sm"
        >
          {/* Full navigation so the marketplace re-reads filters from the URL. */}
          <a href={`/marketplace?${s.query_string}`} className="text-foreground hover:text-accent">
            {s.name}
          </a>
          <button
            onClick={() => remove(s.id)}
            className="text-muted hover:text-red-500"
            aria-label={`Delete saved search ${s.name}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}

      {adding ? (
        <span className="inline-flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') {
                setAdding(false)
                setName('')
              }
            }}
            placeholder="Name this search"
            className="px-2 py-1 text-sm bg-surface border border-border rounded-md text-foreground w-40"
          />
          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="px-2 py-1 text-sm rounded-md bg-accent text-accent-foreground disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => {
              setAdding(false)
              setName('')
            }}
            className="text-muted hover:text-foreground"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </span>
      ) : (
        currentQuery && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border text-sm text-muted hover:border-accent hover:text-foreground transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Save current
          </button>
        )
      )}
    </div>
  )
}
