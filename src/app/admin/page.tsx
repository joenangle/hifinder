'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

type Tab = 'scraper-stats' | 'candidates'

interface ScraperStats {
  summary: {
    totalListings: number
    availableListings: number
    soldListings: number
  }
  bySource: Record<string, number>
}

interface ComponentCandidate {
  id: string
  brand: string
  model: string
  category: string
  price_estimate_new: number | null
  price_observed_min: number | null
  price_observed_max: number | null
  quality_score: number
  listing_count: number
  status: string
  created_at: string
}

interface CandidatesResponse {
  candidates: ComponentCandidate[]
  pagination: {
    offset: number
    limit: number
    total: number
    hasMore: boolean
  }
  summary: {
    total: number
    byStatus: Record<string, number>
    byCategory: Record<string, number>
    avgQualityScore: number
  }
}

interface CandidateDetailsResponse {
  candidate: ComponentCandidate
  triggeringListings: Array<{
    id: string
    title: string
    price: number
    url: string
    date_posted: string
    source: string
  }>
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('scraper-stats')
  const [scraperStats, setScraperStats] = useState<ScraperStats | null>(null)
  const [candidates, setCandidates] = useState<CandidatesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)
  const [candidateDetails, setCandidateDetails] = useState<CandidateDetailsResponse | null>(null)

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin')
    } else if (status === 'authenticated' && session?.user?.email !== 'joenangle@gmail.com') {
      router.push('/')
    }
  }, [status, session, router])

  // Fetch data based on active tab
  useEffect(() => {
    if (status !== 'authenticated') return

    const fetchData = async () => {
      setLoading(true)
      try {
        if (activeTab === 'scraper-stats') {
          const res = await fetch('/api/admin/scraper-stats')
          const data = await res.json()
          setScraperStats(data)
        } else if (activeTab === 'candidates') {
          const res = await fetch('/api/admin/component-candidates?status=pending&sortBy=quality_score&sortOrder=desc')
          const data = await res.json()
          setCandidates(data)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [activeTab, status])

  // Fetch candidate details when selected
  useEffect(() => {
    if (!selectedCandidate) {
      setCandidateDetails(null)
      return
    }

    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/admin/component-candidates/${selectedCandidate}`)
        const data = await res.json()
        setCandidateDetails(data)
      } catch (error) {
        console.error('Error fetching candidate details:', error)
      }
    }

    fetchDetails()
  }, [selectedCandidate])

  const handleApproveCandidate = async (id: string) => {
    if (!confirm('Are you sure you want to approve this candidate and add it to the components table?')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/component-candidates/${id}/approve`, {
        method: 'POST'
      })

      const data = await res.json()

      if (res.ok) {
        alert(`✅ ${data.message}`)
        // Refresh candidates list
        setSelectedCandidate(null)
        const refreshRes = await fetch('/api/admin/component-candidates?status=pending&sortBy=quality_score&sortOrder=desc')
        const refreshData = await refreshRes.json()
        setCandidates(refreshData)
      } else {
        alert(`❌ Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error approving candidate:', error)
      alert('Failed to approve candidate')
    }
  }

  const handleRejectCandidate = async (id: string) => {
    if (!confirm('Are you sure you want to reject this candidate?')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/component-candidates/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        alert('✅ Candidate rejected')
        setSelectedCandidate(null)
        const refreshRes = await fetch('/api/admin/component-candidates?status=pending&sortBy=quality_score&sortOrder=desc')
        const refreshData = await refreshRes.json()
        setCandidates(refreshData)
      } else {
        alert('❌ Failed to reject candidate')
      }
    } catch (error) {
      console.error('Error rejecting candidate:', error)
      alert('Failed to reject candidate')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (status !== 'authenticated' || session?.user?.email !== 'joenangle@gmail.com') {
    return null
  }

  return (
    <div className="min-h-screen bg-background-primary dark:bg-background-primary p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-text-primary dark:text-text-primary">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="border-b border-border-default dark:border-border-default mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('scraper-stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scraper-stats'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
              }`}
            >
              Scraper Stats
            </button>
            <button
              onClick={() => setActiveTab('candidates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'candidates'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
              }`}
            >
              Component Candidates
              {candidates && candidates.summary.byStatus.pending > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-accent-primary rounded-full">
                  {candidates.summary.byStatus.pending}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'scraper-stats' && scraperStats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-6">
                <h3 className="text-sm font-medium text-text-tertiary dark:text-text-tertiary mb-1">Total Listings</h3>
                <p className="text-3xl font-bold text-text-primary dark:text-text-primary">{scraperStats.summary.totalListings}</p>
              </div>
              <div className="card p-6">
                <h3 className="text-sm font-medium text-text-tertiary dark:text-text-tertiary mb-1">Available</h3>
                <p className="text-3xl font-bold text-green-600">{scraperStats.summary.availableListings}</p>
              </div>
              <div className="card p-6">
                <h3 className="text-sm font-medium text-text-tertiary dark:text-text-tertiary mb-1">Sold</h3>
                <p className="text-3xl font-bold text-red-600">{scraperStats.summary.soldListings}</p>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4 text-text-primary dark:text-text-primary">Listings by Source</h3>
              <div className="space-y-2">
                {Object.entries(scraperStats.bySource || {}).map(([source, count]) => (
                  <div key={source} className="flex justify-between">
                    <span className="text-text-secondary dark:text-text-secondary">{source}</span>
                    <span className="font-semibold text-text-primary dark:text-text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'candidates' && candidates && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Candidates List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="card p-6 mb-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-text-tertiary dark:text-text-tertiary">Total Pending:</span>
                    <span className="ml-2 font-semibold text-text-primary dark:text-text-primary">{candidates.summary.byStatus.pending}</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary dark:text-text-tertiary">Avg Quality:</span>
                    <span className="ml-2 font-semibold text-text-primary dark:text-text-primary">{Math.round(candidates.summary.avgQualityScore)}%</span>
                  </div>
                  <div>
                    <span className="text-text-tertiary dark:text-text-tertiary">Total Ever:</span>
                    <span className="ml-2 font-semibold text-text-primary dark:text-text-primary">{candidates.summary.total}</span>
                  </div>
                </div>
              </div>

              {candidates.candidates.length === 0 ? (
                <div className="card p-12 text-center">
                  <p className="text-text-tertiary dark:text-text-tertiary text-lg">No pending candidates</p>
                  <p className="text-text-tertiary dark:text-text-tertiary text-sm mt-2">Check back after the next scraper run</p>
                </div>
              ) : (
                candidates.candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className={`card p-4 cursor-pointer transition-colors ${
                      selectedCandidate === candidate.id
                        ? 'ring-2 ring-accent-primary'
                        : 'hover:bg-surface-hover dark:hover:bg-surface-hover'
                    }`}
                    onClick={() => setSelectedCandidate(candidate.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg text-text-primary dark:text-text-primary">
                          {candidate.brand} {candidate.model}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-sm text-text-secondary dark:text-text-secondary">
                          <span className="px-2 py-1 bg-surface-hover dark:bg-surface-hover rounded">
                            {candidate.category || 'Unknown'}
                          </span>
                          <span>{candidate.listing_count} listing{candidate.listing_count !== 1 ? 's' : ''}</span>
                          {candidate.price_observed_min && (
                            <span>${candidate.price_observed_min} - ${candidate.price_observed_max}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-accent-primary dark:text-accent-primary">
                          {candidate.quality_score}%
                        </div>
                        <div className="text-xs text-text-tertiary dark:text-text-tertiary">Quality</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Details Panel */}
            <div className="lg:col-span-1">
              {selectedCandidate && candidateDetails ? (
                <div className="card p-6 sticky top-8">
                  <h3 className="text-lg font-semibold mb-4 text-text-primary dark:text-text-primary">Candidate Details</h3>

                  <div className="space-y-4 mb-6">
                    <div>
                      <span className="text-sm text-text-tertiary dark:text-text-tertiary">Brand & Model:</span>
                      <p className="font-semibold text-text-primary dark:text-text-primary">
                        {candidateDetails.candidate.brand} {candidateDetails.candidate.model}
                      </p>
                    </div>

                    <div>
                      <span className="text-sm text-text-tertiary dark:text-text-tertiary">Category:</span>
                      <p className="text-text-primary dark:text-text-primary">{candidateDetails.candidate.category || 'Unknown'}</p>
                    </div>

                    {candidateDetails.candidate.price_estimate_new && (
                      <div>
                        <span className="text-sm text-text-tertiary dark:text-text-tertiary">Est. MSRP:</span>
                        <p className="text-text-primary dark:text-text-primary">${candidateDetails.candidate.price_estimate_new}</p>
                      </div>
                    )}

                    <div>
                      <span className="text-sm text-text-tertiary dark:text-text-tertiary">Triggering Listings:</span>
                      <ul className="mt-2 space-y-2">
                        {candidateDetails.triggeringListings.map((listing) => (
                          <li key={listing.id} className="text-sm">
                            <a
                              href={listing.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent-primary dark:text-accent-primary hover:underline"
                            >
                              {listing.title.substring(0, 40)}...
                            </a>
                            <span className="text-text-tertiary dark:text-text-tertiary ml-2">
                              ${listing.price}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproveCandidate(selectedCandidate)}
                      className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors font-medium"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleRejectCandidate(selectedCandidate)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card p-12 text-center sticky top-8">
                  <p className="text-text-tertiary dark:text-text-tertiary">Select a candidate to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
