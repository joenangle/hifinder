const STORAGE_KEY = 'hifinder_recent_searches'
const MAX_SAVED = 5

export interface SavedSearch {
  url: string
  budget: number
  filters: string  // human-readable summary
  timestamp: number
}

export function getSavedSearches(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveSearch(url: string, budget: number, filters: string): void {
  try {
    const existing = getSavedSearches()
    // Deduplicate by URL (update timestamp if same search repeated)
    const filtered = existing.filter(s => s.url !== url)
    const updated = [{ url, budget, filters, timestamp: Date.now() }, ...filtered].slice(0, MAX_SAVED)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage not available
  }
}

export function clearSavedSearches(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}
