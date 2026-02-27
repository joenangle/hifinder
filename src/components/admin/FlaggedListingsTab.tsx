'use client'

import { useState, useEffect } from 'react'

interface FlaggedListing {
  id: string
  title: string
  price: number
  condition: string
  source: string
  url: string
  date_posted: string
  location: string
  seller_username: string
  description: string
  status: string
  match_confidence: number
  requires_manual_review: boolean
  validation_warnings: string[]
  is_ambiguous: boolean
  component: {
    id: string
    brand: string
    name: string
    category: string
    price_new: number
    sound_signature: string
  }
}

interface FlaggedListingsResponse {
  listings: FlaggedListing[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
  summary: {
    total: number
    totalPending: number
    ambiguous: number
    lowConfidence: number
    avgConfidence: number
    byIssueType: {
      low_confidence: number
      ambiguous: number
      price_mismatch: number
      category_conflict: number
      generic_name: number
      no_match: number
    }
  }
}

export default function FlaggedListingsTab() {
  const [data, setData] = useState<FlaggedListingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedListing, setSelectedListing] = useState<string | null>(null)
  const [selectedListingDetails, setSelectedListingDetails] = useState<any>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('pending')
  const [confidenceMin, setConfidenceMin] = useState(0)
  const [confidenceMax, setConfidenceMax] = useState(1)
  const [sourceFilter, setSourceFilter] = useState('all')
  const [sortBy, setSortBy] = useState('match_confidence')
  const [sortOrder, setSortOrder] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)

  // Action states
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Fetch listings
  useEffect(() => {
    fetchListings()
  }, [statusFilter, confidenceMin, confidenceMax, sourceFilter, sortBy, sortOrder, currentPage])

  // Fetch selected listing details
  useEffect(() => {
    if (selectedListing) {
      fetchListingDetails(selectedListing)
    } else {
      setSelectedListingDetails(null)
    }
  }, [selectedListing])

  const fetchListings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        confidenceMin: confidenceMin.toString(),
        confidenceMax: confidenceMax.toString(),
        source: sourceFilter,
        sortBy,
        sortOrder,
        page: currentPage.toString(),
        limit: '20'
      })

      const res = await fetch(`/api/admin/flagged-listings?${params}`)
      const data = await res.json()
      setData(data)
    } catch (error) {
      console.error('Error fetching flagged listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchListingDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/flagged-listings/${id}`)
      const data = await res.json()
      setSelectedListingDetails(data)
    } catch (error) {
      console.error('Error fetching listing details:', error)
    }
  }

  const handleAction = async (action: 'approve' | 'delete' | 'fix', notes?: string, newComponentId?: string) => {
    if (!selectedListing) return

    // Confirmation for delete
    if (action === 'delete') {
      const confirmed = confirm('Are you sure you want to delete this listing? This will mark it as deleted.')
      if (!confirmed) return
    }

    setActionLoading(true)
    setActionMessage(null)

    try {
      const res = await fetch(`/api/admin/flagged-listings/${selectedListing}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes, newComponentId })
      })

      const result = await res.json()

      if (res.ok) {
        setActionMessage({ type: 'success', text: result.message })

        // Refresh listings
        await fetchListings()

        // Auto-advance to next listing
        const currentIndex = data?.listings.findIndex(l => l.id === selectedListing) || 0
        const nextListing = data?.listings[currentIndex + 1]
        if (nextListing) {
          setSelectedListing(nextListing.id)
        } else {
          setSelectedListing(null)
        }

        // Clear message after 3 seconds
        setTimeout(() => setActionMessage(null), 3000)
      } else {
        setActionMessage({ type: 'error', text: result.error || 'Action failed' })
      }
    } catch (error) {
      console.error('Error performing action:', error)
      setActionMessage({ type: 'error', text: 'Network error occurred' })
    } finally {
      setActionLoading(false)
    }
  }

  const getConfidenceBadge = (confidence: number) => {
    if (confidence < 0.5) return { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', emoji: '🔴' }
    if (confidence < 0.7) return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', emoji: '🟡' }
    return { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', emoji: '🟢' }
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-medium text-tertiary mb-1">
            Total Pending
          </h3>
          <p className="text-2xl font-bold text-primary">
            {data?.summary.totalPending || 0}
          </p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-tertiary mb-1">
            Ambiguous
          </h3>
          <p className="text-2xl font-bold text-yellow-600">
            {data?.summary.ambiguous || 0}
          </p>
          <p className="text-xs text-tertiary">
            {data?.summary.totalPending ? ((data.summary.ambiguous / data.summary.totalPending) * 100).toFixed(0) : 0}%
          </p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-tertiary mb-1">
            Low Confidence
          </h3>
          <p className="text-2xl font-bold text-red-600">
            {data?.summary.lowConfidence || 0}
          </p>
          <p className="text-xs text-tertiary">
            {data?.summary.totalPending ? ((data.summary.lowConfidence / data.summary.totalPending) * 100).toFixed(0) : 0}%
          </p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-tertiary mb-1">
            Avg Confidence
          </h3>
          <p className="text-2xl font-bold text-primary">
            {data?.summary.avgConfidence.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-tertiary mb-1">
            Current Page
          </h3>
          <p className="text-2xl font-bold text-primary">
            {currentPage}/{data?.pagination.totalPages || 1}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Filters & List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="card p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full px-3 py-2 border rounded-lg bg-primary text-primary"
                >
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="deleted">Deleted</option>
                  <option value="all">All</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Source
                </label>
                <select
                  value={sourceFilter}
                  onChange={(e) => {
                    setSourceFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full px-3 py-2 border rounded-lg bg-primary text-primary"
                >
                  <option value="all">All Sources</option>
                  <option value="reddit_avexchange">Reddit</option>
                  <option value="reverb">Reverb</option>
                  <option value="ebay">eBay</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Sort By
                </label>
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg bg-primary text-primary"
                  >
                    <option value="match_confidence">Confidence</option>
                    <option value="date_posted">Date Posted</option>
                    <option value="price">Price</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border rounded-lg bg-primary text-primary hover:bg-surface-hover dark:hover:bg-surface-hover"
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Listings List */}
          <div className="space-y-3">
            {data?.listings.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-tertiary text-lg">No flagged listings found</p>
                <p className="text-tertiary text-sm mt-2">
                  Try adjusting your filters
                </p>
              </div>
            ) : (
              data?.listings.map((listing) => {
                const badge = getConfidenceBadge(listing.match_confidence)
                const isSelected = selectedListing === listing.id

                return (
                  <div
                    key={listing.id}
                    onClick={() => setSelectedListing(listing.id)}
                    className={`card p-4 cursor-pointer transition-[border-color,box-shadow] ${
                      isSelected
                        ? 'ring-2 ring-accent'
                        : 'hover:bg-surface-hover dark:hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${badge.color}`}>
                          {badge.emoji} {listing.match_confidence.toFixed(2)}
                        </span>
                        <span className="font-semibold text-primary">
                          {listing.component?.brand} {listing.component?.name}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-primary">
                        ${listing.price}
                      </span>
                    </div>

                    <p className="text-sm text-secondary mb-2 truncate">
                      {listing.title}
                    </p>

                    {listing.validation_warnings && listing.validation_warnings.length > 0 && (
                      <div className="space-y-1 mb-2">
                        {listing.validation_warnings.slice(0, 2).map((warning, idx) => (
                          <div key={idx} className="flex items-start gap-1 text-xs text-yellow-600 dark:text-yellow-500">
                            <span>⚠️</span>
                            <span>{warning}</span>
                          </div>
                        ))}
                        {listing.validation_warnings.length > 2 && (
                          <div className="text-xs text-tertiary">
                            +{listing.validation_warnings.length - 2} more warnings
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-tertiary">
                      <span>📅 {new Date(listing.date_posted).toLocaleDateString()}</span>
                      {listing.location && <span>📍 {listing.location}</span>}
                      <span className="px-2 py-0.5 bg-surface-hover rounded">
                        {listing.source}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border rounded-lg bg-primary text-primary hover:bg-surface-hover dark:hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-secondary">
                Page {currentPage} of {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={currentPage === data.pagination.totalPages}
                className="px-4 py-2 border rounded-lg bg-primary text-primary hover:bg-surface-hover dark:hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        <div className="lg:col-span-1">
          {selectedListing && selectedListingDetails ? (
            <div className="card p-6 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-primary">
                  Listing Details
                </h3>
                <button
                  onClick={() => setSelectedListing(null)}
                  className="text-tertiary hover:text-primary"
                >
                  ✕
                </button>
              </div>

              {actionMessage && (
                <div className={`mb-4 p-3 rounded ${
                  actionMessage.type === 'success'
                    ? 'bg-green-900/20 border border-green-500 text-green-400'
                    : 'bg-red-900/20 border border-red-500 text-red-400'
                }`}>
                  {actionMessage.text}
                </div>
              )}

              <div className="space-y-4">
                {/* Current Match */}
                <div>
                  <h4 className="text-sm font-medium text-tertiary mb-2">
                    Matched Component
                  </h4>
                  <p className="font-semibold text-primary">
                    {selectedListingDetails.listing.component?.brand} {selectedListingDetails.listing.component?.name}
                  </p>
                  <p className="text-sm text-secondary">
                    Category: {selectedListingDetails.listing.component?.category}
                  </p>
                  {selectedListingDetails.listing.component?.price_new && (
                    <p className="text-sm text-secondary">
                      MSRP: ${selectedListingDetails.listing.component.price_new}
                    </p>
                  )}
                </div>

                {/* Listing Info */}
                <div>
                  <h4 className="text-sm font-medium text-tertiary mb-2">
                    Listing Info
                  </h4>
                  <p className="text-sm text-primary mb-1">
                    <strong>Price:</strong> ${selectedListingDetails.listing.price}
                  </p>
                  <p className="text-sm text-primary mb-1">
                    <strong>Condition:</strong> {selectedListingDetails.listing.condition || 'Unknown'}
                  </p>
                  <p className="text-sm text-primary mb-1">
                    <strong>Source:</strong> {selectedListingDetails.listing.source}
                  </p>
                  <a
                    href={selectedListingDetails.listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-accent hover:underline"
                  >
                    View Original Listing ↗
                  </a>
                </div>

                {/* Validation Warnings */}
                {selectedListingDetails.listing.validation_warnings?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-tertiary mb-2">
                      Warnings ({selectedListingDetails.listing.validation_warnings.length})
                    </h4>
                    <div className="space-y-1">
                      {selectedListingDetails.listing.validation_warnings.map((warning: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-1 text-xs text-yellow-600 dark:text-yellow-500">
                          <span>⚠️</span>
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 border-t space-y-2">
                  <button
                    onClick={() => handleAction('approve')}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => handleAction('delete')}
                    disabled={actionLoading}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                  >
                    ✗ Delete
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center sticky top-8">
              <p className="text-tertiary">
                Select a listing to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
