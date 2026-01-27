'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import ComponentsTable from '@/components/admin/ComponentsTable'
import ComponentForm from '@/components/admin/ComponentForm'

type Tab = 'scraper-stats' | 'candidates' | 'components-database' | 'add-component'

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
  // Advanced fields
  sound_signature: string | null
  driver_type: string | null
  impedance: number | null
  needs_amp: boolean | null
  manufacturer_url: string | null
  review_notes: string | null
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
  const [activeTab, setActiveTab] = useState<Tab>('components-database')
  const [scraperStats, setScraperStats] = useState<ScraperStats | null>(null)
  const [candidates, setCandidates] = useState<CandidatesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)
  const [candidateDetails, setCandidateDetails] = useState<CandidateDetailsResponse | null>(null)
  const [editComponentId, setEditComponentId] = useState<string | null>(null)

  // Edit mode state for component candidates
  const [isEditing, setIsEditing] = useState(false)
  const [editedCandidate, setEditedCandidate] = useState<ComponentCandidate | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [verificationWarnings, setVerificationWarnings] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [brandsList, setBrandsList] = useState<string[]>([])
  const [advancedFieldsExpanded, setAdvancedFieldsExpanded] = useState(false)

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

  // Check for duplicates when brand or model changes (debounced 500ms)
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!isEditing || !editedCandidate) return
      if (!editedCandidate.brand?.trim() || !editedCandidate.model?.trim()) {
        setVerificationWarnings(prev => prev.filter(w => w !== 'duplicate'))
        return
      }

      try {
        const params = new URLSearchParams({
          brand: editedCandidate.brand.trim(),
          name: editedCandidate.model.trim(),
        })
        const response = await fetch(`/api/admin/components/check-duplicate?${params}`)
        const data = await response.json()

        if (data.isDuplicate) {
          setVerificationWarnings(prev =>
            !prev.includes('duplicate') ? [...prev, 'duplicate'] : prev
          )
        } else {
          setVerificationWarnings(prev => prev.filter(w => w !== 'duplicate'))
        }
      } catch (err) {
        console.error('Error checking for duplicates:', err)
      }
    }

    const timeoutId = setTimeout(checkDuplicate, 500)
    return () => clearTimeout(timeoutId)
  }, [editedCandidate?.brand, editedCandidate?.model, isEditing])

  // Fetch brands list once on mount
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch('/api/brands')
        const data = await response.json()
        setBrandsList(data)
      } catch (err) {
        console.error('Error fetching brands:', err)
      }
    }

    if (status === 'authenticated') {
      fetchBrands()
    }
  }, [status])

  // Verify brand exists in database (debounced 500ms)
  useEffect(() => {
    const verifyBrand = () => {
      if (!isEditing || !editedCandidate || !editedCandidate.brand?.trim()) {
        setVerificationWarnings(prev => prev.filter(w => w !== 'brand'))
        return
      }

      const normalizedBrand = editedCandidate.brand.trim().toLowerCase()
      const brandExists = brandsList.some(b => b.toLowerCase() === normalizedBrand)

      if (!brandExists) {
        setVerificationWarnings(prev =>
          !prev.includes('brand') ? [...prev, 'brand'] : prev
        )
      } else {
        setVerificationWarnings(prev => prev.filter(w => w !== 'brand'))
      }
    }

    const timeoutId = setTimeout(verifyBrand, 500)
    return () => clearTimeout(timeoutId)
  }, [editedCandidate?.brand, brandsList, isEditing])

  // Keyboard shortcuts for edit mode
  useEffect(() => {
    if (!isEditing) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key: Cancel editing
      if (e.key === 'Escape') {
        setIsEditing(false)
        setEditedCandidate(null)
        setValidationErrors({})
        setVerificationWarnings([])
        setError(null)
      }

      // Cmd+S (Mac) or Ctrl+S (Windows): Save changes
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault() // Prevent browser save dialog
        handleSaveEdit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, editedCandidate]) // eslint-disable-line react-hooks/exhaustive-deps

  // Warn user when leaving page with unsaved changes
  useEffect(() => {
    if (!isEditing) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = '' // Chrome requires returnValue to be set
      return '' // Some browsers use return value
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isEditing])

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

  // Validation and verification helper functions for editing
  const validateCandidate = (candidate: ComponentCandidate): Record<string, string> => {
    const errors: Record<string, string> = {}

    // Required fields
    if (!candidate.brand?.trim()) {
      errors.brand = 'Brand is required'
    }
    if (!candidate.model?.trim()) {
      errors.model = 'Model is required'
    }
    if (!candidate.category) {
      errors.category = 'Category is required'
    }

    // Price validation
    if (candidate.price_observed_min && candidate.price_observed_max) {
      if (candidate.price_observed_min > candidate.price_observed_max) {
        errors.prices = 'Min price cannot be greater than max price'
      }
    }

    return errors
  }

  const handleSaveEdit = async () => {
    if (!editedCandidate || !selectedCandidate) return

    // Validate before saving
    const errors = validateCandidate(editedCandidate)
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    // Show confirmation if duplicate detected
    if (verificationWarnings.includes('duplicate')) {
      const confirmed = confirm(
        `Warning: ${editedCandidate.brand} ${editedCandidate.model} already exists in the database. Do you want to save anyway?`
      )
      if (!confirmed) return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/component-candidates/${selectedCandidate}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          brand: editedCandidate.brand,
          model: editedCandidate.model,
          category: editedCandidate.category,
          price_estimate_new: editedCandidate.price_estimate_new,
          price_used_min: editedCandidate.price_observed_min,
          price_used_max: editedCandidate.price_observed_max,
          // Advanced fields
          sound_signature: editedCandidate.sound_signature,
          driver_type: editedCandidate.driver_type,
          impedance: editedCandidate.impedance,
          needs_amp: editedCandidate.needs_amp,
          manufacturer_url: editedCandidate.manufacturer_url,
          review_notes: editedCandidate.review_notes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save changes')
      }

      const data = await response.json()

      // Update local state
      setCandidateDetails({
        ...candidateDetails!,
        candidate: data.candidate
      })

      if (candidates) {
        setCandidates({
          ...candidates,
          candidates: candidates.candidates.map(c =>
            c.id === data.candidate.id ? data.candidate : c
          )
        })
      }

      // Exit edit mode
      setIsEditing(false)
      setEditedCandidate(null)
      setValidationErrors({})
      setVerificationWarnings([])

      // Show success message
      setSuccessMessage('Changes saved successfully')
      setTimeout(() => setSuccessMessage(null), 3000)

    } catch (error: any) {
      setError(error.message || 'Failed to save changes')
    } finally {
      setSaving(false)
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
              onClick={() => {
                if (isEditing) {
                  const confirmed = confirm('You have unsaved changes. Are you sure you want to leave this page?')
                  if (!confirmed) return
                  setIsEditing(false)
                  setEditedCandidate(null)
                  setValidationErrors({})
                  setVerificationWarnings([])
                  setError(null)
                }
                setActiveTab('components-database')
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'components-database'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
              }`}
            >
              Components Database
            </button>
            <button
              onClick={() => {
                if (isEditing) {
                  const confirmed = confirm('You have unsaved changes. Are you sure you want to leave this page?')
                  if (!confirmed) return
                  setIsEditing(false)
                  setEditedCandidate(null)
                  setValidationErrors({})
                  setVerificationWarnings([])
                  setError(null)
                }
                setActiveTab('add-component')
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'add-component'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
              }`}
            >
              Add Component
            </button>
            <button
              onClick={() => {
                if (isEditing) {
                  const confirmed = confirm('You have unsaved changes. Are you sure you want to leave this page?')
                  if (!confirmed) return
                  setIsEditing(false)
                  setEditedCandidate(null)
                  setValidationErrors({})
                  setVerificationWarnings([])
                  setError(null)
                }
                setActiveTab('scraper-stats')
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scraper-stats'
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
              }`}
            >
              Scraper Stats
            </button>
            <button
              onClick={() => {
                if (isEditing) {
                  const confirmed = confirm('You have unsaved changes. Are you sure you want to leave this page?')
                  if (!confirmed) return
                  setIsEditing(false)
                  setEditedCandidate(null)
                  setValidationErrors({})
                  setVerificationWarnings([])
                  setError(null)
                }
                setActiveTab('candidates')
              }}
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
        {activeTab === 'components-database' && !editComponentId && (
          <ComponentsTable
            onEditComponent={(id) => {
              setEditComponentId(id)
            }}
          />
        )}

        {activeTab === 'components-database' && editComponentId && (
          <ComponentForm
            editComponentId={editComponentId}
            onSuccess={() => {
              setEditComponentId(null)
            }}
            onCancel={() => {
              setEditComponentId(null)
            }}
          />
        )}

        {activeTab === 'add-component' && (
          <ComponentForm
            onSuccess={() => {
              // Switch to database tab to view new component
              setActiveTab('components-database')
            }}
          />
        )}

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
                    onClick={() => {
                      if (isEditing) {
                        const confirmed = confirm('You have unsaved changes. Are you sure you want to switch candidates?')
                        if (!confirmed) return
                        // Reset edit state
                        setIsEditing(false)
                        setEditedCandidate(null)
                        setValidationErrors({})
                        setVerificationWarnings([])
                        setError(null)
                      }
                      setSelectedCandidate(candidate.id)
                    }}
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
                  {/* Success/Error Messages */}
                  {successMessage && (
                    <div className="bg-green-900/20 border border-green-500 rounded p-3 mb-4">
                      <p className="text-green-400 text-sm">✓ {successMessage}</p>
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-900/20 border border-red-500 rounded p-3 mb-4">
                      <p className="text-red-400 text-sm">✗ {error}</p>
                      <button onClick={() => setError(null)} className="text-xs text-red-300 underline mt-1">
                        Dismiss
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary">Candidate Details</h3>
                    {!isEditing ? (
                      <button
                        onClick={() => {
                          setIsEditing(true)
                          setEditedCandidate(candidateDetails.candidate)
                        }}
                        className="px-3 py-1 text-sm bg-surface-hover dark:bg-surface-hover text-text-primary dark:text-text-primary rounded hover:bg-border-default dark:hover:bg-border-default transition-colors"
                      >
                        ✏️ Edit
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="px-3 py-1 text-sm bg-accent-primary text-white rounded hover:bg-accent-secondary transition-colors disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : '💾 Save'}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditing(false)
                            setEditedCandidate(null)
                            setValidationErrors({})
                            setVerificationWarnings([])
                            setError(null)
                          }}
                          disabled={saving}
                          className="px-3 py-1 text-sm bg-surface-hover dark:bg-surface-hover text-text-primary dark:text-text-primary rounded hover:bg-border-default dark:hover:bg-border-default transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 mb-6">
                    {/* Brand Field */}
                    <div>
                      <label className="block text-sm text-text-tertiary dark:text-text-tertiary mb-1">
                        Brand
                        {verificationWarnings.includes('brand') && (
                          <span className="ml-2 text-yellow-500 text-xs">⚠️ New brand (not in database)</span>
                        )}
                      </label>
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editedCandidate?.brand || ''}
                            onChange={(e) => {
                              if (editedCandidate) {
                                setEditedCandidate({...editedCandidate, brand: e.target.value})
                                setValidationErrors(prev => {
                                  const newErrors = {...prev}
                                  delete newErrors.brand
                                  return newErrors
                                })
                              }
                            }}
                            className="w-full px-3 py-2 bg-surface-hover dark:bg-surface-hover border border-border-default dark:border-border-default rounded text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                            placeholder="e.g., Sennheiser"
                          />
                          {validationErrors.brand && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.brand}</p>
                          )}
                        </>
                      ) : (
                        <p className="font-semibold text-text-primary dark:text-text-primary">
                          {candidateDetails.candidate.brand}
                        </p>
                      )}
                    </div>

                    {/* Model Field */}
                    <div>
                      <label className="block text-sm text-text-tertiary dark:text-text-tertiary mb-1">
                        Model
                        {verificationWarnings.includes('duplicate') && (
                          <span className="ml-2 text-red-500 text-xs">❌ Already exists in database</span>
                        )}
                      </label>
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editedCandidate?.model || ''}
                            onChange={(e) => {
                              if (editedCandidate) {
                                setEditedCandidate({...editedCandidate, model: e.target.value})
                                setValidationErrors(prev => {
                                  const newErrors = {...prev}
                                  delete newErrors.model
                                  return newErrors
                                })
                              }
                            }}
                            className="w-full px-3 py-2 bg-surface-hover dark:bg-surface-hover border border-border-default dark:border-border-default rounded text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                            placeholder="e.g., HD 800 S"
                          />
                          {validationErrors.model && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.model}</p>
                          )}
                        </>
                      ) : (
                        <p className="font-semibold text-text-primary dark:text-text-primary">
                          {candidateDetails.candidate.model}
                        </p>
                      )}
                    </div>

                    {/* Category Field */}
                    <div>
                      <label className="block text-sm text-text-tertiary dark:text-text-tertiary mb-1">Category</label>
                      {isEditing ? (
                        <>
                          <select
                            value={editedCandidate?.category || ''}
                            onChange={(e) => {
                              if (editedCandidate) {
                                setEditedCandidate({...editedCandidate, category: e.target.value})
                                setValidationErrors(prev => {
                                  const newErrors = {...prev}
                                  delete newErrors.category
                                  return newErrors
                                })
                              }
                            }}
                            className="w-full px-3 py-2 bg-surface-hover dark:bg-surface-hover border border-border-default dark:border-border-default rounded text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                          >
                            <option value="">Select category...</option>
                            <option value="headphones">Headphones</option>
                            <option value="iems">IEMs</option>
                            <option value="dac">DAC</option>
                            <option value="amp">Amplifier</option>
                            <option value="dac_amp">DAC/Amp Combo</option>
                          </select>
                          {validationErrors.category && (
                            <p className="text-red-500 text-xs mt-1">{validationErrors.category}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-text-primary dark:text-text-primary">{candidateDetails.candidate.category || 'Unknown'}</p>
                      )}
                    </div>

                    {/* Price Fields */}
                    {(isEditing || candidateDetails.candidate.price_estimate_new) && (
                      <div>
                        <label className="block text-sm text-text-tertiary dark:text-text-tertiary mb-1">Est. MSRP</label>
                        {isEditing ? (
                          <>
                            <input
                              type="number"
                              value={editedCandidate?.price_estimate_new || ''}
                              onChange={(e) => {
                                if (editedCandidate) {
                                  setEditedCandidate({...editedCandidate, price_estimate_new: parseFloat(e.target.value) || null})
                                  setValidationErrors(prev => {
                                    const newErrors = {...prev}
                                    delete newErrors.prices
                                    return newErrors
                                  })
                                }
                              }}
                              className="w-full px-3 py-2 bg-surface-hover dark:bg-surface-hover border border-border-default dark:border-border-default rounded text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                              placeholder="500"
                              min="0"
                            />
                            {validationErrors.prices && (
                              <p className="text-red-500 text-xs mt-1">{validationErrors.prices}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-text-primary dark:text-text-primary">${candidateDetails.candidate.price_estimate_new}</p>
                        )}
                      </div>
                    )}

                    {/* Advanced Fields - Collapsible */}
                    {isEditing && (
                      <div className="border-t border-border-default dark:border-border-default pt-4 mt-4">
                        <button
                          type="button"
                          onClick={() => setAdvancedFieldsExpanded(!advancedFieldsExpanded)}
                          className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity mb-3"
                        >
                          <span className="text-sm font-medium text-text-secondary dark:text-text-secondary">
                            Advanced Fields
                          </span>
                          <svg
                            className={`w-4 h-4 text-text-tertiary transition-transform ${advancedFieldsExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {advancedFieldsExpanded && (
                          <div className="space-y-4">
                            {/* Sound Signature */}
                            <div>
                              <label className="block text-sm text-text-tertiary dark:text-text-tertiary mb-1">
                                Sound Signature
                              </label>
                              <select
                                value={editedCandidate?.sound_signature || ''}
                                onChange={(e) => {
                                  if (editedCandidate) {
                                    setEditedCandidate({...editedCandidate, sound_signature: e.target.value || null})
                                  }
                                }}
                                className="w-full px-3 py-2 bg-surface-hover dark:bg-surface-hover border border-border-default dark:border-border-default rounded text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary text-sm"
                              >
                                <option value="">Not specified</option>
                                <option value="neutral">Neutral</option>
                                <option value="warm">Warm</option>
                                <option value="bright">Bright</option>
                                <option value="fun">Fun (V-shaped)</option>
                              </select>
                            </div>

                            {/* Driver Type */}
                            <div>
                              <label className="block text-sm text-text-tertiary dark:text-text-tertiary mb-1">
                                Driver Type
                              </label>
                              <input
                                type="text"
                                value={editedCandidate?.driver_type || ''}
                                onChange={(e) => {
                                  if (editedCandidate) {
                                    setEditedCandidate({...editedCandidate, driver_type: e.target.value || null})
                                  }
                                }}
                                className="w-full px-3 py-2 bg-surface-hover dark:bg-surface-hover border border-border-default dark:border-border-default rounded text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary text-sm"
                                placeholder="e.g., Dynamic, Planar Magnetic"
                              />
                            </div>

                            {/* Impedance */}
                            <div>
                              <label className="block text-sm text-text-tertiary dark:text-text-tertiary mb-1">
                                Impedance (Ω)
                              </label>
                              <input
                                type="number"
                                value={editedCandidate?.impedance || ''}
                                onChange={(e) => {
                                  if (editedCandidate) {
                                    setEditedCandidate({...editedCandidate, impedance: e.target.value ? parseInt(e.target.value) : null})
                                  }
                                }}
                                className="w-full px-3 py-2 bg-surface-hover dark:bg-surface-hover border border-border-default dark:border-border-default rounded text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary text-sm"
                                placeholder="32"
                                min="0"
                              />
                            </div>

                            {/* Needs Amp */}
                            <div>
                              <label className="block text-sm text-text-tertiary dark:text-text-tertiary mb-1">
                                Needs Amplifier?
                              </label>
                              <select
                                value={editedCandidate?.needs_amp === null ? '' : String(editedCandidate?.needs_amp)}
                                onChange={(e) => {
                                  if (editedCandidate) {
                                    setEditedCandidate({
                                      ...editedCandidate,
                                      needs_amp: e.target.value === '' ? null : e.target.value === 'true'
                                    })
                                  }
                                }}
                                className="w-full px-3 py-2 bg-surface-hover dark:bg-surface-hover border border-border-default dark:border-border-default rounded text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary text-sm"
                              >
                                <option value="">Not specified</option>
                                <option value="true">Yes</option>
                                <option value="false">No</option>
                              </select>
                            </div>

                            {/* Manufacturer URL */}
                            <div>
                              <label className="block text-sm text-text-tertiary dark:text-text-tertiary mb-1">
                                Manufacturer URL
                              </label>
                              <input
                                type="url"
                                value={editedCandidate?.manufacturer_url || ''}
                                onChange={(e) => {
                                  if (editedCandidate) {
                                    setEditedCandidate({...editedCandidate, manufacturer_url: e.target.value || null})
                                  }
                                }}
                                className="w-full px-3 py-2 bg-surface-hover dark:bg-surface-hover border border-border-default dark:border-border-default rounded text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary text-sm"
                                placeholder="https://..."
                              />
                            </div>

                            {/* Review Notes */}
                            <div>
                              <label className="block text-sm text-text-tertiary dark:text-text-tertiary mb-1">
                                Review Notes
                              </label>
                              <textarea
                                value={editedCandidate?.review_notes || ''}
                                onChange={(e) => {
                                  if (editedCandidate) {
                                    setEditedCandidate({...editedCandidate, review_notes: e.target.value || null})
                                  }
                                }}
                                className="w-full px-3 py-2 bg-surface-hover dark:bg-surface-hover border border-border-default dark:border-border-default rounded text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary text-sm"
                                placeholder="Additional notes about this component..."
                                rows={3}
                              />
                            </div>
                          </div>
                        )}
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
                      disabled={isEditing}
                      className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleRejectCandidate(selectedCandidate)}
                      disabled={isEditing}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
