'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { UserGearItem } from '@/lib/gear'
import { StackWithGear, StackPurpose, updateStack } from '@/lib/stacks'
import { supabase } from '@/lib/supabase'
import { Component } from '@/types'
import Link from 'next/link'
import {
  Package,
  Search,
  X,
  Layers,
  Edit2,
  Trash2,
  Plus as PlusIcon,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { GearPageHeader } from '@/components/gear/GearPageHeader'
import { GearFilters } from '@/components/gear/GearFilters'
import { BrandCombobox } from '@/components/gear/BrandCombobox'
import { CategoryFilter, getGearCategory, calculateCurrentValue, getCategoryIcon } from '@/lib/gear-utils'

type ViewMode = 'grid' | 'list' | 'stacks'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [gear, setGear] = useState<UserGearItem[]>([])
  const [stacks, setStacks] = useState<StackWithGear[]>([])
  const [loading, setLoading] = useState(true)

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeFilters, setActiveFilters] = useState<Set<CategoryFilter>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateStackModal, setShowCreateStackModal] = useState(false)
  const [showEditStackModal, setShowEditStackModal] = useState(false)
  const [selectedStackForEdit, setSelectedStackForEdit] = useState<StackWithGear | null>(null)
  const [selectedGear, setSelectedGear] = useState<UserGearItem | null>(null)

  // Collection stats
  const [stats, setStats] = useState({
    totalItems: 0,
    totalInvested: 0,
    currentValue: 0,
    depreciation: 0
  })

  const [newStackName, setNewStackName] = useState('')
  const [newStackDescription, setNewStackDescription] = useState('')
  const [newStackPurpose, setNewStackPurpose] = useState<StackPurpose>('general')
  const [editStackName, setEditStackName] = useState('')
  const [editStackDescription, setEditStackDescription] = useState('')

  // State for drag and drop
  const [draggedGear, setDraggedGear] = useState<UserGearItem | null>(null)
  const [dragOverStack, setDragOverStack] = useState<string | null>(null)

  // Edit gear form state
  const [editFormData, setEditFormData] = useState({
    purchase_date: '',
    purchase_price: '',
    purchase_location: '',
    condition: 'used' as 'new' | 'used' | 'refurbished' | 'b-stock',
    serial_number: '',
    notes: '',
    custom_name: '',
    custom_brand: '',
    custom_category: ''
  })

  // Add gear form state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Component[]>([])
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)
  const [isCustomEntry, setIsCustomEntry] = useState(false)

  // Brand/product suggestions
  const [availableBrands, setAvailableBrands] = useState<string[]>([])
  const [addFormData, setAddFormData] = useState({
    purchase_date: '',
    purchase_price: '',
    purchase_location: '',
    condition: 'used' as 'new' | 'used' | 'refurbished' | 'b-stock',
    serial_number: '',
    notes: '',
    custom_name: '',
    custom_brand: '',
    custom_category: 'headphones'
  })

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/api/auth/signin?callbackUrl=/dashboard')
    }
  }, [status])

  const loadData = useCallback(async () => {
    if (!session?.user?.id) return

    setLoading(true)
    try {
      // Fetch gear via dashboard API
      const dashboardResponse = await fetch('/api/user/dashboard', {
        credentials: 'include'
      })

      if (!dashboardResponse.ok) {
        throw new Error(`Dashboard API error: ${dashboardResponse.status}`)
      }

      const dashboardData = await dashboardResponse.json()
      const gearItems: UserGearItem[] = dashboardData.gear || []
      const stackItems = dashboardData.stacks || []

      setGear(gearItems)
      setStacks(stackItems)

      // Calculate stats
      const totalInvested = gearItems.reduce((sum, item) => sum + (item.purchase_price || 0), 0)
      const currentValue = gearItems.reduce((sum, item) => sum + calculateCurrentValue(item), 0)
      const depreciation = totalInvested - currentValue

      setStats({
        totalItems: gearItems.length,
        totalInvested,
        currentValue,
        depreciation
      })

    } catch (error) {
      console.error('Error loading data:', error)
    }
    setLoading(false)
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) {
      loadData()
    }
  }, [session?.user?.id, loadData])

  // Populate edit form when gear is selected for editing
  useEffect(() => {
    if (selectedGear && showEditModal) {
      setEditFormData({
        purchase_date: selectedGear.purchase_date || '',
        purchase_price: selectedGear.purchase_price?.toString() || '',
        purchase_location: selectedGear.purchase_location || '',
        condition: selectedGear.condition || 'used',
        serial_number: selectedGear.serial_number || '',
        notes: selectedGear.notes || '',
        custom_name: selectedGear.custom_name || '',
        custom_brand: selectedGear.custom_brand || '',
        custom_category: selectedGear.custom_category || ''
      })
    }
  }, [selectedGear, showEditModal])

  // Load available brands on mount
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await fetch('/api/brands')
        if (response.ok) {
          const brands = await response.json()
          setAvailableBrands(brands)
        }
      } catch (error) {
        console.error('Error loading brands:', error)
      }
    }
    loadBrands()
  }, [])

  const searchComponents = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    const { data, error } = await supabase
      .from('components')
      .select('*')
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(10)

    if (!error && data) {
      setSearchResults(data)
    }
  }

  const handleAddGear = async () => {
    if (!session?.user?.id) return

    // Validation
    if (!isCustomEntry && !selectedComponent) {
      alert('Please select a component or switch to custom entry')
      return
    }

    if (isCustomEntry && (!addFormData.custom_name || !addFormData.custom_brand)) {
      alert('Please fill in both brand and model for custom entry')
      return
    }

    const gearData: Partial<UserGearItem> = {
      component_id: selectedComponent?.id,
      purchase_date: addFormData.purchase_date || undefined,
      purchase_price: addFormData.purchase_price ? parseFloat(addFormData.purchase_price) : undefined,
      purchase_location: addFormData.purchase_location || undefined,
      condition: addFormData.condition,
      serial_number: addFormData.serial_number || undefined,
      notes: addFormData.notes || undefined,
    }

    if (isCustomEntry) {
      gearData.custom_name = addFormData.custom_name
      gearData.custom_brand = addFormData.custom_brand
      gearData.custom_category = addFormData.custom_category
    }

    try {
      const response = await fetch('/api/gear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(gearData)
      })

      if (response.ok) {
        await loadData()
        setShowAddModal(false)
        resetAddForm()
      } else {
        const error = await response.json()
        alert('Failed to add gear item: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Exception in handleAddGear:', error)
      alert('Error adding gear: ' + error)
    }
  }

  const handleRemoveGear = async (gearId: string) => {
    if (!session?.user?.id) return

    try {
      const response = await fetch(`/api/gear?id=${gearId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (response.ok) {
        await loadData()
      } else {
        const error = await response.json()
        alert('Failed to remove gear: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error removing gear:', error)
      alert('Error removing gear: ' + error)
    }
  }

  const handleCreateStack = async () => {
    if (!session?.user?.id || !newStackName.trim()) return

    try {
      const response = await fetch('/api/stacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newStackName.trim(),
          description: newStackDescription.trim() || null,
          purpose: newStackPurpose
        })
      })

      if (response.ok) {
        await loadData()
        setShowCreateStackModal(false)
        setNewStackName('')
        setNewStackDescription('')
        setNewStackPurpose('general')
      } else {
        const error = await response.json()
        alert('Failed to create stack: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating stack:', error)
      alert('Error creating stack: ' + error)
    }
  }

  const handleEditStack = async () => {
    if (!selectedStackForEdit || !editStackName.trim()) return

    const success = await updateStack(
      selectedStackForEdit.id,
      {
        name: editStackName.trim(),
        description: editStackDescription.trim() || undefined
      }
    )

    if (success) {
      await loadData()
      setShowEditStackModal(false)
      setSelectedStackForEdit(null)
      setEditStackName('')
      setEditStackDescription('')
    }
  }

  const handleEditGear = async () => {
    if (!session?.user?.id || !selectedGear) return

    const updateData: Partial<UserGearItem> = {
      purchase_date: editFormData.purchase_date || undefined,
      purchase_price: editFormData.purchase_price ? parseFloat(editFormData.purchase_price) : undefined,
      purchase_location: editFormData.purchase_location || undefined,
      condition: editFormData.condition,
      serial_number: editFormData.serial_number || undefined,
      notes: editFormData.notes || undefined
    }

    // Only update custom fields if this is a custom entry
    if (selectedGear.custom_name || selectedGear.custom_brand) {
      updateData.custom_name = editFormData.custom_name || undefined
      updateData.custom_brand = editFormData.custom_brand || undefined
      updateData.custom_category = editFormData.custom_category || undefined
    }

    try {
      const response = await fetch(`/api/gear?id=${selectedGear.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        await loadData()
        setShowEditModal(false)
        setSelectedGear(null)
      } else {
        const error = await response.json()
        alert('Failed to update gear: ' + (error.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating gear:', error)
      alert('Error updating gear: ' + error)
    }
  }

  // Helper function to add gear to stack via API
  const addGearToStackAPI = async (stackId: string, gearId: string) => {
    const response = await fetch('/api/stacks/components', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        stack_id: stackId,
        user_gear_id: gearId
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add gear to stack')
    }

    return response.json()
  }

  // Helper function to remove gear from stack via API
  const removeGearFromStackAPI = async (stackId: string, gearId: string) => {
    const response = await fetch(`/api/stacks/components?stack_id=${stackId}&user_gear_id=${gearId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to remove gear from stack')
    }

    return response.json()
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, gearItem: UserGearItem) => {
    setDraggedGear(gearItem)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedGear(null)
    setDragOverStack(null)
  }

  const handleDragOver = (e: React.DragEvent, stackId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStack(stackId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverStack(null)
  }

  const handleDrop = async (e: React.DragEvent, stackId: string) => {
    e.preventDefault()
    if (draggedGear) {
      try {
        await addGearToStackAPI(stackId, draggedGear.id)
        await loadData()
      } catch (error: unknown) {
        console.error('Error adding gear to stack via drag-and-drop:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to add gear to stack'
        alert(errorMessage)
      }
    }
    setDraggedGear(null)
    setDragOverStack(null)
  }

  const resetAddForm = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedComponent(null)
    setIsCustomEntry(false)
    setAddFormData({
      purchase_date: '',
      purchase_price: '',
      purchase_location: '',
      condition: 'used',
      serial_number: '',
      notes: '',
      custom_name: '',
      custom_brand: '',
      custom_category: 'headphones'
    })
  }

  const exportCollection = () => {
    const csv = [
      ['Brand', 'Model', 'Category', 'Purchase Date', 'Price Paid', 'Condition', 'Location', 'Notes'],
      ...gear.map(item => [
        item.components?.brand || item.custom_brand || '',
        item.components?.name || item.custom_name || '',
        item.components?.category || item.custom_category || '',
        item.purchase_date || '',
        item.purchase_price || '',
        item.condition || '',
        item.purchase_location || '',
        item.notes || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-audio-gear.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Calculate depreciation percentage for an item
  const calculateDepreciation = (item: UserGearItem): number => {
    const paid = item.purchase_price || 0
    const current = calculateCurrentValue(item)
    if (paid === 0) return 0
    return ((paid - current) / paid) * 100
  }


  // Filter gear by active filters
  const filteredGear = gear.filter(item => {
    if (activeFilters.size === 0) return true
    const category = getGearCategory(item)
    return activeFilters.has(category)
  })

  // Calculate category counts
  const categoryCounts: Record<CategoryFilter, number> = {
    all: gear.length,
    headphones: gear.filter(item => getGearCategory(item) === 'headphones').length,
    iems: gear.filter(item => getGearCategory(item) === 'iems').length,
    dacs: gear.filter(item => getGearCategory(item) === 'dacs').length,
    amps: gear.filter(item => getGearCategory(item) === 'amps').length,
    combo: gear.filter(item => getGearCategory(item) === 'combo').length
  }

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  // Get category badge styling (consistent with recommendations page)
  const getCategoryBadgeStyle = (category: string) => {
    switch (category) {
      case 'headphones':
        return 'bg-orange-100 text-orange-800'
      case 'iems':
        return 'bg-amber-100 text-amber-800'
      case 'dacs':
        return 'bg-blue-100 text-blue-800'
      case 'amps':
        return 'bg-purple-100 text-purple-800'
      case 'combo':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get condition badge styling
  const getConditionBadgeStyle = (condition: string) => {
    switch (condition) {
      case 'new':
        return 'bg-green-100 text-green-800'
      case 'used':
        return 'bg-yellow-100 text-yellow-800'
      case 'refurbished':
        return 'bg-blue-100 text-blue-800'
      case 'b-stock':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="text-text-secondary">Loading your collection...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Header with stats */}
      <GearPageHeader stats={stats} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="mb-6">
          <GearFilters
            selectedCategory={activeFilters.size === 0 ? 'all' : Array.from(activeFilters)[0]}
            onCategoryChange={(category) => {
              if (category === 'all') {
                setActiveFilters(new Set())
              } else {
                setActiveFilters(new Set([category]))
              }
            }}
            categoryCounts={categoryCounts}
            onAddGear={() => setShowAddModal(true)}
            onExport={exportCollection}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>

        {/* Empty state */}
        {gear.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <h2 className="heading-2 mb-2">No gear yet</h2>
            <p className="text-text-secondary mb-6">Start building your collection</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
            >
              Add Your First Item
            </button>
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && filteredGear.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredGear.map((item) => {
              const category = getGearCategory(item)
              const currentValue = calculateCurrentValue(item)
              const depreciation = calculateDepreciation(item)
              const brand = item.components?.brand || item.custom_brand || 'Unknown'
              const model = item.components?.name || item.custom_name || 'Unknown'

              return (
                <div
                  key={item.id}
                  className="card p-4 hover:border-border-focus transition-all cursor-pointer"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  onClick={() => {
                    setSelectedGear(item)
                    setShowDetailsModal(true)
                  }}
                >
                  {/* Category & Condition Badges */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getCategoryBadgeStyle(category)}`}>
                      {category}
                    </span>
                    {item.condition && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConditionBadgeStyle(item.condition)}`}>
                        {item.condition}
                      </span>
                    )}
                  </div>

                  {/* Brand/Model */}
                  <div className="mb-3">
                    <p className="font-semibold text-text-primary">{brand}</p>
                    <p className="text-sm text-text-secondary">{model}</p>
                  </div>

                  {/* Value Tracking */}
                  {item.purchase_price && (
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-tertiary">Paid:</span>
                        <span className="text-text-primary">{formatPrice(item.purchase_price)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-tertiary">Current:</span>
                        <span className="text-text-primary">{formatPrice(currentValue)}</span>
                      </div>
                      {depreciation !== 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-tertiary">Value:</span>
                          <div className="flex items-center gap-1">
                            {depreciation > 0 ? (
                              <TrendingDown className="w-3 h-3 text-red-500" />
                            ) : (
                              <TrendingUp className="w-3 h-3 text-green-500" />
                            )}
                            <span className={`text-xs font-medium ${depreciation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {depreciation > 0 ? '-' : '+'}{Math.abs(depreciation).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Find Used Listings Button */}
                  <Link
                    href={`/used-market?search=${encodeURIComponent(brand + ' ' + model)}`}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Search className="w-4 h-4" />
                    <span>Find Used Listings</span>
                  </Link>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedGear(item)
                        setShowEditModal(true)
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-surface-hover rounded hover:bg-surface-elevated transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Remove this item from your collection?')) {
                          handleRemoveGear(item.id)
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && filteredGear.length > 0 && (
          <div className="space-y-3">
            {filteredGear.map((item) => {
              const category = getGearCategory(item)
              const currentValue = calculateCurrentValue(item)
              const depreciation = calculateDepreciation(item)
              const brand = item.components?.brand || item.custom_brand || 'Unknown'
              const model = item.components?.name || item.custom_name || 'Unknown'

              return (
                <div
                  key={item.id}
                  className="card p-4 flex items-center gap-4 hover:border-border-focus transition-all"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-surface-elevated rounded-lg flex items-center justify-center text-text-tertiary">
                    {getCategoryIcon(category)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryBadgeStyle(category)}`}>
                        {category}
                      </span>
                      {item.condition && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getConditionBadgeStyle(item.condition)}`}>
                          {item.condition}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-text-primary">{brand} {model}</p>
                    {item.purchase_price && (
                      <div className="flex items-center gap-4 mt-1 text-sm text-text-secondary">
                        <span>Paid: {formatPrice(item.purchase_price)}</span>
                        <span>Current: {formatPrice(currentValue)}</span>
                        {depreciation !== 0 && (
                          <span className={depreciation > 0 ? 'text-red-600' : 'text-green-600'}>
                            {depreciation > 0 ? '-' : '+'}{Math.abs(depreciation).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/used-market?search=${encodeURIComponent(brand + ' ' + model)}`}
                      className="px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                    >
                      Find Used
                    </Link>
                    <button
                      onClick={() => {
                        setSelectedGear(item)
                        setShowEditModal(true)
                      }}
                      className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Remove this item?')) {
                          handleRemoveGear(item.id)
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Stacks View */}
        {viewMode === 'stacks' && (
          <div className="space-y-6">
            {/* Create Stack Button */}
            <button
              onClick={() => setShowCreateStackModal(true)}
              className="w-full flex items-center justify-center gap-2 p-6 border-2 border-dashed border-border-default rounded-lg hover:border-accent-primary hover:bg-surface-hover transition-all"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="font-medium">Create New Stack</span>
            </button>

            {/* Stacks */}
            {stacks.map((stack) => (
              <div
                key={stack.id}
                className={`card p-6 transition-all ${dragOverStack === stack.id ? 'border-accent-primary bg-accent-primary/5' : ''}`}
                onDragOver={(e) => handleDragOver(e, stack.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stack.id)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Layers className="w-6 h-6 text-accent-primary" />
                    <div>
                      <h3 className="heading-3">{stack.name}</h3>
                      {stack.description && (
                        <p className="text-sm text-text-secondary">{stack.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedStackForEdit(stack)
                        setEditStackName(stack.name)
                        setEditStackDescription(stack.description || '')
                        setShowEditStackModal(true)
                      }}
                      className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stack Items */}
                {stack.stack_components && stack.stack_components.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {stack.stack_components.map((sc) => {
                      const item = sc.user_gear
                      const category = getGearCategory(item)
                      const brand = item.components?.brand || item.custom_brand || 'Unknown'
                      const model = item.components?.name || item.custom_name || 'Unknown'

                      return (
                        <div
                          key={item.id}
                          className="p-3 bg-surface-hover rounded-lg flex items-center gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryBadgeStyle(category)}`}>
                              {category}
                            </span>
                            <p className="text-sm font-medium text-text-primary mt-1 truncate">
                              {brand} {model}
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await removeGearFromStackAPI(stack.id, item.id)
                                await loadData()
                              } catch (error) {
                                alert(error instanceof Error ? error.message : 'Failed to remove gear from stack')
                              }
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-border-subtle rounded-lg">
                    <p className="text-text-tertiary text-sm">
                      Drag and drop gear here to add to this stack
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Gear Modal (simplified - full implementation from gear page can be copied) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-base rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-2">Add Gear</h2>
              <button onClick={() => setShowAddModal(false)} className="text-text-secondary hover:text-text-primary">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Search or Custom Entry Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setIsCustomEntry(false)}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${!isCustomEntry ? 'bg-accent-primary text-white' : 'bg-surface-hover text-text-secondary'}`}
              >
                Search Database
              </button>
              <button
                onClick={() => setIsCustomEntry(true)}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${isCustomEntry ? 'bg-accent-primary text-white' : 'bg-surface-hover text-text-secondary'}`}
              >
                Custom Entry
              </button>
            </div>

            {!isCustomEntry ? (
              <>
                {/* Search Component */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search by brand or model..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      searchComponents(e.target.value)
                    }}
                    className="w-full px-4 py-2 border border-border-default rounded-lg"
                  />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mb-4 max-h-48 overflow-y-auto space-y-2">
                    {searchResults.map((component) => (
                      <button
                        key={component.id}
                        onClick={() => {
                          setSelectedComponent(component)
                          setSearchResults([])
                          setSearchQuery(`${component.brand} ${component.name}`)
                        }}
                        className="w-full p-3 text-left bg-surface-hover hover:bg-surface-elevated rounded-lg transition-colors"
                      >
                        <p className="font-medium">{component.brand} {component.name}</p>
                        <p className="text-sm text-text-secondary">{component.category}</p>
                      </button>
                    ))}
                  </div>
                )}

                {selectedComponent && (
                  <div className="mb-4 p-3 bg-accent-primary/10 rounded-lg">
                    <p className="font-medium text-accent-primary">Selected: {selectedComponent.brand} {selectedComponent.name}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Custom Entry Fields */}
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Brand</label>
                    <BrandCombobox
                      value={addFormData.custom_brand}
                      onChange={(value) => setAddFormData({ ...addFormData, custom_brand: value })}
                      availableBrands={availableBrands}
                      className="w-full px-4 py-2 border border-border-default rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Model</label>
                    <input
                      type="text"
                      value={addFormData.custom_name}
                      onChange={(e) => setAddFormData({ ...addFormData, custom_name: e.target.value })}
                      className="w-full px-4 py-2 border border-border-default rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select
                      value={addFormData.custom_category}
                      onChange={(e) => setAddFormData({ ...addFormData, custom_category: e.target.value })}
                      className="w-full px-4 py-2 border border-border-default rounded-lg"
                    >
                      <option value="headphones">Headphones</option>
                      <option value="iems">IEMs</option>
                      <option value="dacs">DACs</option>
                      <option value="amps">Amplifiers</option>
                      <option value="combo">Combo</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Common Fields */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Purchase Price ($)</label>
                  <input
                    type="number"
                    value={addFormData.purchase_price}
                    onChange={(e) => setAddFormData({ ...addFormData, purchase_price: e.target.value })}
                    className="w-full px-4 py-2 border border-border-default rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Condition</label>
                  <select
                    value={addFormData.condition}
                    onChange={(e) => setAddFormData({ ...addFormData, condition: e.target.value as 'new' | 'used' | 'refurbished' | 'b-stock' })}
                    className="w-full px-4 py-2 border border-border-default rounded-lg"
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="b-stock">B-Stock</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-surface-hover rounded-lg hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGear}
                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
              >
                Add to Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (simplified placeholder) */}
      {showEditModal && selectedGear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-base rounded-lg p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-2">Edit Gear</h2>
              <button onClick={() => setShowEditModal(false)} className="text-text-secondary hover:text-text-primary">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Purchase Price ($)</label>
                  <input
                    type="number"
                    value={editFormData.purchase_price}
                    onChange={(e) => setEditFormData({ ...editFormData, purchase_price: e.target.value })}
                    className="w-full px-4 py-2 border border-border-default rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Condition</label>
                  <select
                    value={editFormData.condition}
                    onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value as 'new' | 'used' | 'refurbished' | 'b-stock' })}
                    className="w-full px-4 py-2 border border-border-default rounded-lg"
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="b-stock">B-Stock</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-border-default rounded-lg"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-surface-hover rounded-lg hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditGear}
                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal (simplified placeholder) */}
      {showDetailsModal && selectedGear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-base rounded-lg p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-2">Gear Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="text-text-secondary hover:text-text-primary">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-text-tertiary">Brand</p>
                <p className="font-medium">{selectedGear.components?.brand || selectedGear.custom_brand}</p>
              </div>
              <div>
                <p className="text-sm text-text-tertiary">Model</p>
                <p className="font-medium">{selectedGear.components?.name || selectedGear.custom_name}</p>
              </div>
              {selectedGear.purchase_price && (
                <>
                  <div>
                    <p className="text-sm text-text-tertiary">Purchase Price</p>
                    <p className="font-medium">{formatPrice(selectedGear.purchase_price)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-tertiary">Current Value</p>
                    <p className="font-medium">{formatPrice(calculateCurrentValue(selectedGear))}</p>
                  </div>
                </>
              )}
              {selectedGear.notes && (
                <div>
                  <p className="text-sm text-text-tertiary">Notes</p>
                  <p className="text-text-secondary">{selectedGear.notes}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowDetailsModal(false)}
              className="w-full mt-6 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Create Stack Modal (simplified placeholder) */}
      {showCreateStackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-base rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-2">Create Stack</h2>
              <button onClick={() => setShowCreateStackModal(false)} className="text-text-secondary hover:text-text-primary">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Stack Name</label>
                <input
                  type="text"
                  value={newStackName}
                  onChange={(e) => setNewStackName(e.target.value)}
                  className="w-full px-4 py-2 border border-border-default rounded-lg"
                  placeholder="e.g., Desktop Setup"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  value={newStackDescription}
                  onChange={(e) => setNewStackDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-border-default rounded-lg"
                  rows={3}
                  placeholder="Describe this stack..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateStackModal(false)}
                className="flex-1 px-4 py-2 bg-surface-hover rounded-lg hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStack}
                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
              >
                Create Stack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stack Modal (simplified placeholder) */}
      {showEditStackModal && selectedStackForEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-base rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-2">Edit Stack</h2>
              <button onClick={() => setShowEditStackModal(false)} className="text-text-secondary hover:text-text-primary">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Stack Name</label>
                <input
                  type="text"
                  value={editStackName}
                  onChange={(e) => setEditStackName(e.target.value)}
                  className="w-full px-4 py-2 border border-border-default rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={editStackDescription}
                  onChange={(e) => setEditStackDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-border-default rounded-lg"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEditStackModal(false)}
                className="flex-1 px-4 py-2 bg-surface-hover rounded-lg hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditStack}
                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-secondary transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
