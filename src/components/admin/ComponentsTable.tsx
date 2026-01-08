'use client'

import { useState, useEffect } from 'react'
import { Component } from '@/types'
import { useDebounce } from '@/hooks/useDebounce'

interface ComponentsTableProps {
  onEditComponent?: (componentId: string) => void
}

export default function ComponentsTable({ onEditComponent }: ComponentsTableProps) {
  const [components, setComponents] = useState<Component[]>([])
  const [filteredComponents, setFilteredComponents] = useState<Component[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300) // 300ms debounce
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [soundSignatureFilter, setSoundSignatureFilter] = useState<string>('all')
  const [expertDataFilter, setExpertDataFilter] = useState<string>('all') // all, has, missing
  const [priceNewMin, setPriceNewMin] = useState<string>('')
  const [priceNewMax, setPriceNewMax] = useState<string>('')
  const [priceUsedMin, setPriceUsedMin] = useState<string>('')
  const [priceUsedMax, setPriceUsedMax] = useState<string>('')
  const [sortBy, setSortBy] = useState<'name' | 'brand' | 'price_new' | 'created_at'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // Fetch all components
  useEffect(() => {
    const fetchComponents = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/components')
        const data = await res.json()
        setComponents(data)
        setFilteredComponents(data)
      } catch (error) {
        console.error('Error fetching components:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchComponents()
  }, [])

  // Apply filters and search (debounced search for better performance)
  useEffect(() => {
    let filtered = [...components]

    // Search filter (uses debounced value)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.brand.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((c) => c.category === categoryFilter)
    }

    // Sound signature filter
    if (soundSignatureFilter !== 'all') {
      filtered = filtered.filter((c) => c.sound_signature === soundSignatureFilter)
    }

    // Expert data filter
    if (expertDataFilter === 'has') {
      filtered = filtered.filter((c) => c.crin_rank || c.asr_sinad)
    } else if (expertDataFilter === 'missing') {
      filtered = filtered.filter((c) => !c.crin_rank && !c.asr_sinad)
    }

    // Price filters (new)
    if (priceNewMin) {
      const min = parseFloat(priceNewMin)
      filtered = filtered.filter((c) => c.price_new && c.price_new >= min)
    }
    if (priceNewMax) {
      const max = parseFloat(priceNewMax)
      filtered = filtered.filter((c) => c.price_new && c.price_new <= max)
    }

    // Price filters (used)
    if (priceUsedMin) {
      const min = parseFloat(priceUsedMin)
      filtered = filtered.filter((c) => c.price_used_min && c.price_used_min >= min)
    }
    if (priceUsedMax) {
      const max = parseFloat(priceUsedMax)
      filtered = filtered.filter((c) => c.price_used_max && c.price_used_max <= max)
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal

      if (sortBy === 'name') {
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
      } else if (sortBy === 'brand') {
        aVal = a.brand.toLowerCase()
        bVal = b.brand.toLowerCase()
      } else if (sortBy === 'price_new') {
        aVal = a.price_new || 0
        bVal = b.price_new || 0
      } else if (sortBy === 'created_at') {
        aVal = new Date(a.created_at).getTime()
        bVal = new Date(b.created_at).getTime()
      } else {
        return 0
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    setFilteredComponents(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [
    debouncedSearchQuery, // Use debounced value to reduce filtering frequency
    categoryFilter,
    soundSignatureFilter,
    expertDataFilter,
    priceNewMin,
    priceNewMax,
    priceUsedMin,
    priceUsedMax,
    sortBy,
    sortOrder,
    components
  ])

  // Pagination
  const totalPages = Math.ceil(filteredComponents.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const endIdx = startIdx + itemsPerPage
  const currentComponents = filteredComponents.slice(startIdx, endIdx)

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'ID',
      'Brand',
      'Model',
      'Category',
      'Price New',
      'Price Used Min',
      'Price Used Max',
      'Sound Signature',
      'Driver Type',
      'Impedance',
      'Needs Amp',
      'ASR SINAD',
      'ASR Review URL',
      'Crin Rank',
      'Crin Tone',
      'Crin Tech',
      'Crin Value',
      'Crin Signature',
      'Manufacturer URL',
      'Source'
    ]

    const csvData = filteredComponents.map(c => [
      c.id,
      c.brand,
      c.name,
      c.category,
      c.price_new || '',
      c.price_used_min || '',
      c.price_used_max || '',
      c.sound_signature || '',
      c.driver_type || '',
      c.impedance || '',
      c.needs_amp !== null ? (c.needs_amp ? 'Yes' : 'No') : '',
      c.asr_sinad || '',
      c.asr_review_url || '',
      c.crin_rank || '',
      c.crin_tone || '',
      c.crin_tech || '',
      c.crin_value || '',
      c.crin_signature || '',
      c.manufacturer_url || '',
      c.source || ''
    ])

    const csvContent = [
      headers.join(','),
      ...csvData.map(row =>
        row.map(cell =>
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
            ? `"${cell.replace(/"/g, '""')}"`
            : cell
        ).join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `components-export-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Category stats
  const categoryStats = components.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-medium text-text-tertiary dark:text-text-tertiary mb-1">
            Total Components
          </h3>
          <p className="text-2xl font-bold text-text-primary dark:text-text-primary">
            {components.length}
          </p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-text-tertiary dark:text-text-tertiary mb-1">
            Headphones
          </h3>
          <p className="text-2xl font-bold text-text-primary dark:text-text-primary">
            {categoryStats['cans'] || 0}
          </p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-text-tertiary dark:text-text-tertiary mb-1">
            IEMs
          </h3>
          <p className="text-2xl font-bold text-text-primary dark:text-text-primary">
            {categoryStats['iems'] || 0}
          </p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-text-tertiary dark:text-text-tertiary mb-1">
            DACs
          </h3>
          <p className="text-2xl font-bold text-text-primary dark:text-text-primary">
            {categoryStats['dac'] || 0}
          </p>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-medium text-text-tertiary dark:text-text-tertiary mb-1">
            Amps
          </h3>
          <p className="text-2xl font-bold text-text-primary dark:text-text-primary">
            {(categoryStats['amp'] || 0) + (categoryStats['dac_amp'] || 0)}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card p-6">
        {/* Row 1: Search and Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-2">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by brand or model name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-border-default dark:border-border-default rounded-lg bg-background-primary dark:bg-background-primary text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-border-default dark:border-border-default rounded-lg bg-background-primary dark:bg-background-primary text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="all">All Categories</option>
              <option value="cans">Headphones</option>
              <option value="iems">IEMs</option>
              <option value="dac">DAC</option>
              <option value="amp">Amp</option>
              <option value="dac_amp">DAC/Amp Combo</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-2">
              Sort By
            </label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 px-4 py-2 border border-border-default dark:border-border-default rounded-lg bg-background-primary dark:bg-background-primary text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="created_at">Date Added</option>
                <option value="name">Name</option>
                <option value="brand">Brand</option>
                <option value="price_new">Price</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-border-default dark:border-border-default rounded-lg bg-background-primary dark:bg-background-primary text-text-primary dark:text-text-primary hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Price Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Price New Min */}
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-2">
              Price New (Min)
            </label>
            <input
              type="number"
              placeholder="Min $"
              value={priceNewMin}
              onChange={(e) => setPriceNewMin(e.target.value)}
              className="w-full px-4 py-2 border border-border-default dark:border-border-default rounded-lg bg-background-primary dark:bg-background-primary text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>

          {/* Price New Max */}
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-2">
              Price New (Max)
            </label>
            <input
              type="number"
              placeholder="Max $"
              value={priceNewMax}
              onChange={(e) => setPriceNewMax(e.target.value)}
              className="w-full px-4 py-2 border border-border-default dark:border-border-default rounded-lg bg-background-primary dark:bg-background-primary text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>

          {/* Price Used Min */}
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-2">
              Price Used (Min)
            </label>
            <input
              type="number"
              placeholder="Min $"
              value={priceUsedMin}
              onChange={(e) => setPriceUsedMin(e.target.value)}
              className="w-full px-4 py-2 border border-border-default dark:border-border-default rounded-lg bg-background-primary dark:bg-background-primary text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>

          {/* Price Used Max */}
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-2">
              Price Used (Max)
            </label>
            <input
              type="number"
              placeholder="Max $"
              value={priceUsedMax}
              onChange={(e) => setPriceUsedMax(e.target.value)}
              className="w-full px-4 py-2 border border-border-default dark:border-border-default rounded-lg bg-background-primary dark:bg-background-primary text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>
        </div>

        {/* Row 3: Sound Signature and Expert Data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sound Signature Filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-2">
              Sound Signature
            </label>
            <select
              value={soundSignatureFilter}
              onChange={(e) => setSoundSignatureFilter(e.target.value)}
              className="w-full px-4 py-2 border border-border-default dark:border-border-default rounded-lg bg-background-primary dark:bg-background-primary text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="all">All Signatures</option>
              <option value="neutral">Neutral</option>
              <option value="warm">Warm</option>
              <option value="bright">Bright</option>
              <option value="fun">Fun</option>
            </select>
          </div>

          {/* Expert Data Filter */}
          <div>
            <label className="block text-sm font-medium text-text-secondary dark:text-text-secondary mb-2">
              Expert Data
            </label>
            <select
              value={expertDataFilter}
              onChange={(e) => setExpertDataFilter(e.target.value)}
              className="w-full px-4 py-2 border border-border-default dark:border-border-default rounded-lg bg-background-primary dark:bg-background-primary text-text-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="all">All Components</option>
              <option value="has">Has Expert Data</option>
              <option value="missing">Missing Expert Data</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('')
                setCategoryFilter('all')
                setSoundSignatureFilter('all')
                setExpertDataFilter('all')
                setPriceNewMin('')
                setPriceNewMax('')
                setPriceUsedMin('')
                setPriceUsedMax('')
              }}
              className="w-full px-4 py-2 border border-border-default dark:border-border-default rounded-lg bg-background-primary dark:bg-background-primary text-text-secondary dark:text-text-secondary hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Actions Row */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-text-tertiary dark:text-text-tertiary">
            Showing {startIdx + 1}-{Math.min(endIdx, filteredComponents.length)} of{' '}
            {filteredComponents.length} components
          </div>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors flex items-center gap-2 font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export to CSV ({filteredComponents.length})
          </button>
        </div>
      </div>

      {/* Components Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-hover dark:bg-surface-hover">
              <tr>
                <th className="sticky top-0 z-10 px-6 py-3 text-left text-xs font-medium text-text-tertiary dark:text-text-tertiary uppercase tracking-wider bg-surface-hover dark:bg-surface-hover">
                  Brand
                </th>
                <th className="sticky top-0 z-10 px-6 py-3 text-left text-xs font-medium text-text-tertiary dark:text-text-tertiary uppercase tracking-wider bg-surface-hover dark:bg-surface-hover">
                  Model
                </th>
                <th className="sticky top-0 z-10 px-6 py-3 text-left text-xs font-medium text-text-tertiary dark:text-text-tertiary uppercase tracking-wider bg-surface-hover dark:bg-surface-hover">
                  Category
                </th>
                <th className="sticky top-0 z-10 px-6 py-3 text-left text-xs font-medium text-text-tertiary dark:text-text-tertiary uppercase tracking-wider bg-surface-hover dark:bg-surface-hover">
                  Price (New)
                </th>
                <th className="sticky top-0 z-10 px-6 py-3 text-left text-xs font-medium text-text-tertiary dark:text-text-tertiary uppercase tracking-wider bg-surface-hover dark:bg-surface-hover">
                  Price (Used)
                </th>
                <th className="sticky top-0 z-10 px-6 py-3 text-left text-xs font-medium text-text-tertiary dark:text-text-tertiary uppercase tracking-wider bg-surface-hover dark:bg-surface-hover">
                  Sound
                </th>
                <th className="sticky top-0 z-10 px-6 py-3 text-left text-xs font-medium text-text-tertiary dark:text-text-tertiary uppercase tracking-wider bg-surface-hover dark:bg-surface-hover">
                  Expert Data
                </th>
                <th className="sticky top-0 z-10 px-6 py-3 text-left text-xs font-medium text-text-tertiary dark:text-text-tertiary uppercase tracking-wider bg-surface-hover dark:bg-surface-hover">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default dark:divide-border-default">
              {currentComponents.map((component) => {
                // Check for missing data
                const hasPrice = component.price_new || component.price_used_min
                const hasExpertData = component.crin_rank || component.asr_sinad

                return (
                  <tr
                    key={component.id}
                    className="hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary dark:text-text-primary">
                      {component.brand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-text-primary">
                      {component.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded bg-surface-hover dark:bg-surface-hover text-text-secondary dark:text-text-secondary text-xs uppercase">
                        {component.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-text-primary">
                      {component.price_new ? (
                        `$${component.price_new}`
                      ) : (
                        <span className="text-text-tertiary dark:text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary dark:text-text-primary">
                      {component.price_used_min && component.price_used_max ? (
                        `$${component.price_used_min} - $${component.price_used_max}`
                      ) : (
                        <span className="text-text-tertiary dark:text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {component.sound_signature ? (
                        <span className="capitalize text-text-primary dark:text-text-primary">
                          {component.sound_signature}
                        </span>
                      ) : (
                        <span className="text-text-tertiary dark:text-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {hasExpertData ? (
                        <span className="text-green-600 dark:text-green-500">✓</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-500">✗</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => onEditComponent?.(component.id)}
                        className="text-accent-primary dark:text-accent-primary hover:underline font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filteredComponents.length === 0 && (
          <div className="py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-text-tertiary dark:text-text-tertiary mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-text-tertiary dark:text-text-tertiary text-lg font-medium mb-2">
              No components found
            </p>
            <p className="text-text-tertiary dark:text-text-tertiary text-sm mb-4">
              Try adjusting your search or filter criteria
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setCategoryFilter('all')
                setSoundSignatureFilter('all')
                setExpertDataFilter('all')
                setPriceNewMin('')
                setPriceNewMax('')
                setPriceUsedMin('')
                setPriceUsedMax('')
              }}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border-default dark:border-border-default rounded-lg bg-background-primary dark:bg-background-primary text-text-secondary dark:text-text-secondary hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-border-default dark:border-border-default rounded-lg bg-background-primary dark:bg-background-primary text-text-primary dark:text-text-primary hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary dark:text-text-secondary">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-border-default dark:border-border-default rounded-lg bg-background-primary dark:bg-background-primary text-text-primary dark:text-text-primary hover:bg-surface-hover dark:hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
