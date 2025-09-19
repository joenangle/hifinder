'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { UserGearItem } from '@/lib/gear'
import { StackWithGear, StackPurpose, createStack, deleteStack, calculateStackValue, updateStack, checkStackCompatibility, stackTemplates } from '@/lib/stacks'
import { supabase } from '@/lib/supabase'
import { Component, CollectionStats } from '@/types'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package,
  Search,
  X,
  Layers,
  Edit2,
  Trash2,
  Plus as PlusIcon,
  MoreVertical
} from 'lucide-react'
import { GearPageHeader } from '@/components/gear/GearPageHeader'
import { GearFilters } from '@/components/gear/GearFilters'
import { BrandCombobox } from '@/components/gear/BrandCombobox'
import { CategoryFilter, getGearCategory, calculateCurrentValue, getCategoryIcon } from '@/lib/gear-utils'

type ViewMode = 'grid' | 'list' | 'stacks'


function GearContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [gear, setGear] = useState<UserGearItem[]>([])
  const [stacks, setStacks] = useState<StackWithGear[]>([])
  const [loading, setLoading] = useState(true)
  
  // Initialize view mode from URL params
  const getInitialViewMode = (): ViewMode => {
    const tab = searchParams.get('tab')
    if (tab === 'stacks') return 'stacks'
    return 'grid'
  }
  
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode)
  const [activeFilters, setActiveFilters] = useState<Set<CategoryFilter>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateStackModal, setShowCreateStackModal] = useState(false)
  const [showAddGearModal, setShowAddGearModal] = useState(false)
  const [showEditStackModal, setShowEditStackModal] = useState(false)
  const [selectedStackForGear, setSelectedStackForGear] = useState<StackWithGear | null>(null)
  const [selectedStackForEdit, setSelectedStackForEdit] = useState<StackWithGear | null>(null)
  const [selectedGear, setSelectedGear] = useState<UserGearItem | null>(null)
  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null)
  const [newStackName, setNewStackName] = useState('')
  const [newStackDescription, setNewStackDescription] = useState('')
  const [newStackPurpose, setNewStackPurpose] = useState<StackPurpose>('general')
  const [editStackName, setEditStackName] = useState('')
  const [editStackDescription, setEditStackDescription] = useState('')
  const [editStackPurpose, setEditStackPurpose] = useState<StackPurpose>('general')
  // TODO: Implement edit stack purpose functionality
  void editStackPurpose
  void setEditStackPurpose

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
  // Removed unused suggestion state variables
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
      
      // Use stats from dashboard API directly
      if (dashboardData.collectionStats) {
        setCollectionStats(dashboardData.collectionStats)
      }
      
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
    console.log('🔍 searchComponents called with query:', query);
    
    if (query.length < 2) {
      console.log('❌ Query too short, clearing results');
      setSearchResults([])
      return
    }

    console.log('📞 Making supabase query...');
    const { data, error } = await supabase
      .from('components')
      .select('*')
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(10)

    console.log('📊 Query result:', { data: data?.length, error });
    
    if (!error && data) {
      console.log('✅ Setting search results:', data.length, 'items');
      setSearchResults(data)
    } else if (error) {
      console.error('❌ Search error:', error);
    }
  }

  const handleAddGear = async () => {
    console.log('🔄 handleAddGear called');
    console.log('Session user ID:', session?.user?.id);
    console.log('Is custom entry:', isCustomEntry);
    console.log('Selected component:', selectedComponent);
    console.log('Form data:', addFormData);
    
    if (!session?.user?.id) {
      console.log('❌ No user session');
      return;
    }
    
    // Validation
    if (!isCustomEntry && !selectedComponent) {
      console.log('❌ No component selected and not custom entry');
      alert('Please select a component or switch to custom entry');
      return;
    }
    
    if (isCustomEntry && (!addFormData.custom_name || !addFormData.custom_brand)) {
      console.log('❌ Missing custom entry fields');
      alert('Please fill in both brand and model for custom entry');
      return;
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

    console.log('🚀 Attempting to add gear with data:', gearData);
    
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
        const newItem = await response.json()
        console.log('✅ Success! Added gear item:', newItem);
        await loadData()
        setShowAddModal(false)
        resetAddForm()
      } else {
        const error = await response.json()
        console.log('❌ Add failed:', error);
        alert('Failed to add gear item: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Exception in handleAddGear:', error);
      alert('Error adding gear: ' + error);
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
        console.error('Failed to remove gear:', error)
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
        console.error('Failed to create stack:', error)
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
        description: editStackDescription.trim() || undefined,
        purpose: editStackPurpose
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
        console.error('Failed to update gear:', error)
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
  }


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--background-primary)'}}>
        <div className="text-center">
          <h1 className="heading-2 mb-4">Sign in to view your gear</h1>
          <Link href="/api/auth/signin" className="button button-primary">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--background-primary)'}}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  // Calculate category counts for filters
  const categoryCounts = {
    all: gear.length,
    headphones: gear.filter(item => getGearCategory(item) === 'headphones').length,
    iems: gear.filter(item => getGearCategory(item) === 'iems').length,
    dacs: gear.filter(item => getGearCategory(item) === 'dacs').length,
    amps: gear.filter(item => getGearCategory(item) === 'amps').length,
    combo: gear.filter(item => getGearCategory(item) === 'combo').length,
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--background-primary)', color: 'var(--text-primary)'}}>
      {/* Compact Integrated Header - 56px only */}
      <GearPageHeader 
        stats={{
          totalItems: gear.length,
          totalInvested: collectionStats?.totalPaid || 0,
          currentValue: collectionStats?.currentValue || 0,
          depreciation: collectionStats?.depreciation || 0
        }}
      />
      
      {/* Filters Section - sticky below header, full width */}
      <div className="sticky top-[120px] z-20 border-b border-border-default shadow-sm" style={{backgroundColor: 'var(--background-primary)'}}>
        <div className="max-w-7xl mx-auto pt-4 pb-4" style={{paddingLeft: '24px', paddingRight: '24px'}}>
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
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto relative" style={{paddingLeft: '24px', paddingRight: '24px'}}>
        {/* Content Area - with padding from divider */}
        <div className="pt-10 relative">
        {/* Gear Display - Grid/List/Stacks */}
        {(() => {
          // Handle different view modes
          if (viewMode === 'stacks') {
            // Stacks View
            return (
              <div className="space-y-6">
                {/* Create Stack Button */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                    My Stacks ({stacks.length})
                  </h3>
                  <button
                    onClick={() => setShowCreateStackModal(true)}
                    className="button button-primary flex items-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Create Stack
                  </button>
                </div>

                {/* Stacks List */}
                {stacks.length === 0 ? (
                  <div className="max-w-4xl mx-auto py-8">
                    {/* Welcome Header */}
                    <div className="text-center mb-8">
                      <div className="inline-flex items-center justify-center p-3 bg-orange-500/10 rounded-2xl mb-4">
                        <Layers className="w-12 h-12 text-orange-500" />
                      </div>
                      <h2 className="text-2xl font-bold mb-3" style={{color: 'var(--text-primary)'}}>
                        Welcome to Stack Builder
                      </h2>
                      <p className="text-base max-w-2xl mx-auto" style={{color: 'var(--text-secondary)'}}>
                        Organize your audio gear into purposeful setups. Perfect for managing multiple listening
                        environments or tracking what&apos;s at home vs. what you travel with.
                      </p>
                    </div>

                    {/* What are Stacks? */}
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 mb-8">
                      <h3 className="font-semibold mb-4 flex items-center gap-2" style={{color: 'var(--text-primary)'}}>
                        <span className="text-lg">🎯</span> What are Stacks?
                      </h3>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="flex gap-3">
                          <span className="text-2xl">🏠</span>
                          <div>
                            <div className="font-medium text-sm mb-1" style={{color: 'var(--text-primary)'}}>Desktop Setup</div>
                            <div className="text-xs" style={{color: 'var(--text-secondary)'}}>Your main listening station at home</div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-2xl">🎒</span>
                          <div>
                            <div className="font-medium text-sm mb-1" style={{color: 'var(--text-primary)'}}>Portable Rig</div>
                            <div className="text-xs" style={{color: 'var(--text-secondary)'}}>Gear for commute and travel</div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <span className="text-2xl">🎮</span>
                          <div>
                            <div className="font-medium text-sm mb-1" style={{color: 'var(--text-primary)'}}>Gaming Setup</div>
                            <div className="text-xs" style={{color: 'var(--text-secondary)'}}>Optimized for competitive gaming</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="text-center mb-8">
                      <button
                        onClick={() => setShowCreateStackModal(true)}
                        className="button button-primary text-base px-6 py-3"
                      >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Create Your First Stack
                      </button>
                    </div>
                    
                    {/* Stack Templates */}
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
                        Quick Start Templates
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {stackTemplates.map(template => (
                          <div
                            key={template.id}
                            onClick={async () => {
                              const newStack = await createStack(session?.user?.id || '', template.name, template.description)
                              if (newStack) loadData()
                            }}
                            className="card p-4 hover:shadow-lg transition-all cursor-pointer border-2 border-dashed border-secondary hover:border-primary"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">{template.icon}</span>
                              <div>
                                <h4 className="font-semibold text-sm" style={{color: 'var(--text-primary)'}}>
                                  {template.name}
                                </h4>
                                <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                                  ${template.budgetRange.min}-${template.budgetRange.max}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                              {template.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {stacks.map(stack => {
                      const stackStats = calculateStackValue(stack)
                      const warnings = checkStackCompatibility(stack)
                      return (
                        <div 
                          key={stack.id} 
                          className={`card p-6 ${
                            dragOverStack === stack.id ? 'ring-2 ring-accent-primary bg-accent-primary/10' : ''
                          }`}
                          onDragOver={(e) => handleDragOver(e, stack.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, stack.id)}
                        >
                          {/* Stack Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                                {stack.name}
                              </h3>
                              {stack.description && (
                                <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
                                  {stack.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedStackForEdit(stack)
                                  setEditStackName(stack.name)
                                  setEditStackDescription(stack.description || '')
                                  setShowEditStackModal(true)
                                }}
                                className="p-1 rounded hover:bg-secondary text-secondary hover:text-primary transition-colors"
                                title="Edit Stack"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm('Are you sure you want to delete this stack?')) {
                                    await deleteStack(stack.id)
                                    loadData()
                                  }
                                }}
                                className="p-1 rounded hover:bg-secondary text-secondary hover:text-primary transition-colors"
                                title="Delete Stack"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Stack Stats */}
                          <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded" style={{backgroundColor: 'var(--background-secondary)'}}>
                            <div className="text-center">
                              <div className="text-sm" style={{color: 'var(--text-secondary)'}}>Items</div>
                              <div className="font-semibold" style={{color: 'var(--text-primary)'}}>{stackStats.componentCount}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm" style={{color: 'var(--text-secondary)'}}>Invested</div>
                              <div className="font-semibold" style={{color: 'var(--text-primary)'}}>{formatCurrency(stackStats.totalPaid)}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm" style={{color: 'var(--text-secondary)'}}>Value</div>
                              <div className="font-semibold" style={{color: 'var(--text-primary)'}}>{formatCurrency(stackStats.currentValue)}</div>
                            </div>
                          </div>

                          {/* Compatibility Warnings */}
                          {warnings.length > 0 && (
                            <div className="mb-4 space-y-2">
                              {warnings.map((warning, index) => (
                                <div key={index} className={`p-2 rounded text-xs flex items-center gap-2 ${
                                  warning.severity === 'error' 
                                    ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                                    : 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'
                                }`}>
                                  <span className="font-medium">⚠️</span>
                                  <span>{warning.message}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Stack Components */}
                          <div className="space-y-2">
                            {stack.stack_components.map((component, index) => (
                              <div key={component.id} className="flex items-center gap-3 p-2 rounded" style={{backgroundColor: 'var(--background-tertiary)'}}>
                                <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-medium" style={{backgroundColor: 'var(--accent-primary)', color: 'white'}}>
                                  {index + 1}
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-sm" style={{color: 'var(--text-primary)'}}>
                                    {component.user_gear?.components?.brand || component.user_gear?.custom_brand} {component.user_gear?.components?.name || component.user_gear?.custom_name}
                                  </div>
                                  <div className="text-xs" style={{color: 'var(--text-secondary)'}}>
                                    {component.user_gear?.components?.category || component.user_gear?.custom_category}
                                  </div>
                                </div>
                                <button
                                  onClick={async () => {
                                    if (confirm('Remove this item from the stack?')) {
                                      try {
                                        await removeGearFromStackAPI(stack.id, component.user_gear_id)
                                        await loadData()
                                      } catch (error: unknown) {
                                        const errorMessage = error instanceof Error ? error.message : 'Failed to remove gear from stack'
                                        alert(errorMessage)
                                      }
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-secondary text-secondary hover:text-error transition-colors"
                                  title="Remove from Stack"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Drop Zone Indicator */}
                          {draggedGear && dragOverStack === stack.id && (
                            <div className="mt-3 p-4 border-2 border-dashed border-accent-primary rounded bg-accent-primary/10 text-center">
                              <div className="text-sm font-medium" style={{color: 'var(--accent-primary)'}}>
                                Drop to add &ldquo;{draggedGear.components?.name || draggedGear.custom_name}&rdquo; to stack
                              </div>
                            </div>
                          )}

                          {/* Add Gear to Stack */}
                          <button
                            onClick={() => {
                              setSelectedStackForGear(stack)
                              setShowAddGearModal(true)
                            }}
                            className={`w-full mt-3 p-2 border-2 border-dashed transition-colors text-sm ${
                              draggedGear 
                                ? 'border-accent-primary/50 text-accent-primary/50' 
                                : 'border-secondary text-secondary hover:text-primary hover:border-primary'
                            }`}
                          >
                            + Add Gear to Stack
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* All Gear (Individual View) */}
                {(() => {
                  // Show all gear, regardless of stack membership
                  // Users might want to use the same gear in multiple stacks (e.g., same headphones with different amps)
                  const filteredAllGear = activeFilters.size === 0
                    ? gear
                    : gear.filter(item => activeFilters.has(getGearCategory(item)))

                  return filteredAllGear.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
                        Individual Gear ({filteredAllGear.length})
                        {stacks.length > 0 && (
                          <span className="text-sm font-normal text-secondary ml-2">
                            • Drag to add to stacks
                          </span>
                        )}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {filteredAllGear.map(item => (
                          <div
                            key={item.id}
                            className={`card p-3 hover:shadow-lg transition-all cursor-pointer ${
                              draggedGear?.id === item.id ? 'opacity-50' : ''
                            }`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragEnd={handleDragEnd}
                            onClick={() => {
                              setSelectedGear(item)
                              setShowDetailsModal(true)
                            }}
                          >
                            <div className="text-center">
                              <div className="w-10 h-10 mx-auto mb-2 bg-secondary rounded flex items-center justify-center opacity-60">
                                {getCategoryIcon(item.components?.category || item.custom_category || 'other')}
                              </div>
                              <div className="font-medium text-xs truncate" style={{color: 'var(--text-primary)'}}>
                                {item.components?.brand || item.custom_brand}
                              </div>
                              <div className="text-xs truncate" style={{color: 'var(--text-secondary)'}}>
                                {item.components?.name || item.custom_name}
                              </div>
                              {item.purchase_price && (
                                <div className="text-xs font-semibold mt-1" style={{color: 'var(--accent-primary)'}}>
                                  ${item.purchase_price}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          }

          // Grid/List View (existing logic)
          const filteredGear = activeFilters.size === 0 
            ? gear 
            : gear.filter(item => activeFilters.has(getGearCategory(item)))

          return filteredGear.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-secondary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-primary mb-2">
                {activeFilters.size === 0 ? 'No gear yet' : 'No matching gear'}
              </h2>
              <p className="text-secondary mb-6">
                {activeFilters.size === 0 
                  ? 'Start building your collection by adding your first item'
                  : 'Try adjusting your filters or add new gear to your collection'
                }
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="button button-primary"
              >
                {activeFilters.size === 0 ? 'Add Your First Item' : 'Add Gear'}
              </button>
            </div>
          ) : (
            <div className={`${viewMode === 'grid' 
              ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3' 
              : 'space-y-2'
            }`}>
              {filteredGear.map(item => (
              <div
                key={item.id}
                className={`card hover:shadow-lg transition-all cursor-pointer ${
                  draggedGear?.id === item.id ? 'opacity-50' : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  setSelectedGear(item)
                  setShowDetailsModal(true)
                }}
              >
                {viewMode === 'grid' ? (
                  <div>
                    {/* Compact Grid View */}
                    <div className="h-16 bg-secondary rounded-t-lg p-3 flex items-center justify-center">
                      {item.components?.image_url ? (
                        <Image
                          src={item.components.image_url}
                          alt={item.components.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-2xl opacity-60">
                          {getCategoryIcon(item.components?.category || item.custom_category || 'other')}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="mb-2">
                        <h3 className="font-medium text-sm truncate" style={{color: 'var(--text-primary)'}}>
                          {item.components?.brand || item.custom_brand}
                        </h3>
                        <p className="text-xs truncate" style={{color: 'var(--text-secondary)'}}>
                          {item.components?.name || item.custom_name}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        {item.purchase_price ? (
                          <span className="text-sm font-semibold" style={{color: 'var(--accent-primary)'}}>
                            ${item.purchase_price}
                          </span>
                        ) : (
                          <span></span>
                        )}
                        {item.condition && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            item.condition === 'new' ? 'bg-green-500/20 text-green-500' : 
                            item.condition === 'used' ? 'bg-yellow-500/20 text-yellow-500' :
                            'bg-blue-500/20 text-blue-500'
                          }`}>
                            {item.condition}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs" style={{color: 'var(--text-secondary)'}}>
                        <div className="truncate flex-1">
                          {item.components?.impedance && (
                            <span>{item.components.impedance}</span>
                          )}
                          {item.components?.impedance && item.purchase_date && <span> • </span>}
                          {item.purchase_date && (
                            <span>{new Date(item.purchase_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedGear(item)
                            setShowEditModal(true)
                          }}
                          className="p-1 rounded hover:bg-secondary/20 transition-colors ml-2"
                          title="Edit gear"
                        >
                          <MoreVertical className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3">
                    {/* Compact List View */}
                    <div className="flex-shrink-0">
                      {item.components?.image_url ? (
                        <div className="w-12 h-12 rounded bg-secondary overflow-hidden">
                          <Image
                            src={item.components.image_url}
                            alt={item.components.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center opacity-60">
                          {getCategoryIcon(item.components?.category || item.custom_category || 'other')}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate" style={{color: 'var(--text-primary)'}}>
                        {item.components?.brand || item.custom_brand} {item.components?.name || item.custom_name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs mt-1" style={{color: 'var(--text-secondary)'}}>
                        {item.components?.impedance && (
                          <span>{item.components.impedance}</span>
                        )}
                        {item.purchase_date && (
                          <span>{new Date(item.purchase_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center gap-2">
                        {item.purchase_price && (
                          <span className="text-sm font-semibold" style={{color: 'var(--accent-primary)'}}>
                            ${item.purchase_price}
                          </span>
                        )}
                        {item.condition && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            item.condition === 'new' ? 'bg-green-500/20 text-green-500' : 
                            item.condition === 'used' ? 'bg-yellow-500/20 text-yellow-500' :
                            'bg-blue-500/20 text-blue-500'
                          }`}>
                            {item.condition}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedGear(item)
                            setShowEditModal(true)
                          }}
                          className="p-1 rounded hover:bg-secondary/20 transition-colors"
                          title="Edit gear"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              ))}
            </div>
          )
        })()}
        </div>
      </div>

      {/* Add Gear Modal */}
      {showAddModal && (
        <div 
          className="modal-backdrop animate-fadeIn"
          onClick={() => {
            setShowAddModal(false)
            resetAddForm()
          }}
        >
          <div 
            className="modal-container animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Add Gear</h2>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetAddForm()
                }}
                className="modal-close"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body">
              <p className="form-helper">* Required fields</p>
              
              {/* Toggle between search and custom entry */}
              <div className="modal-tabs">
                <button
                  onClick={() => setIsCustomEntry(false)}
                  className={`modal-tab ${!isCustomEntry ? 'active' : ''}`}
                >
                  Search Database
                </button>
                <button
                  onClick={() => setIsCustomEntry(true)}
                  className={`modal-tab ${isCustomEntry ? 'active' : ''}`}
                >
                  Custom Entry
                </button>
              </div>

              {!isCustomEntry ? (
                <>
                  {/* Component Search */}
                  <div className="form-group">
                    <label className="label">
                      Search for Component
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          searchComponents(e.target.value)
                        }}
                        placeholder="Search by brand or model..."
                        className="input pr-10"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Search className="w-5 h-5 text-tertiary" />
                      </div>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto shadow-lg" style={{backgroundColor: 'var(--surface-card)', borderColor: 'var(--border-default)'}}>
                        {(() => {
                          console.log('🔄 Rendering dropdown with', searchResults.length, 'results');
                          return searchResults.map(component => (
                            <button
                            key={component.id}
                            onClick={() => {
                              setSelectedComponent(component)
                              setSearchResults([])
                              setSearchQuery(`${component.brand} ${component.name}`)
                            }}
                            className="w-full px-4 py-3 text-left transition-colors flex justify-between border-b last:border-b-0"
                            style={{
                              borderBottomColor: 'var(--border-subtle)',
                              color: 'var(--text-primary)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <span className="font-medium">{component.brand} {component.name}</span>
                            <span className="text-sm capitalize" style={{color: 'var(--text-secondary)'}}>{component.category}</span>
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Custom Entry Fields */}
                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label className="label label-required">
                        Brand
                      </label>
                      <BrandCombobox
                        value={addFormData.custom_brand}
                        onChange={(value) => setAddFormData({...addFormData, custom_brand: value})}
                        availableBrands={availableBrands}
                        placeholder="Search existing brands or enter new..."
                        className="input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="label label-required">
                        Model
                      </label>
                      <input
                        type="text"
                        value={addFormData.custom_name}
                        onChange={(e) => setAddFormData({...addFormData, custom_name: e.target.value})}
                        className="input"
                        placeholder="e.g., WH-1000XM5"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="label">
                        Category
                      </label>
                      <select
                        value={addFormData.custom_category}
                        onChange={(e) => setAddFormData({...addFormData, custom_category: e.target.value})}
                        className="input"
                      >
                        <option value="headphones">Headphones</option>
                        <option value="dacs">DAC</option>
                        <option value="amps">Amplifier</option>
                        <option value="combo">DAC/Amp Combo</option>
                        <option value="cables">Cables</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Purchase Details */}
              <h3 className="heading-4 mb-4">Purchase Details</h3>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="label">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={addFormData.purchase_date}
                    onChange={(e) => setAddFormData({...addFormData, purchase_date: e.target.value})}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label className="label">
                    Price Paid
                  </label>
                  <input
                    type="number"
                    value={addFormData.purchase_price}
                    onChange={(e) => setAddFormData({...addFormData, purchase_price: e.target.value})}
                    placeholder="0.00"
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label className="label">
                    Condition
                  </label>
                  <select
                    value={addFormData.condition}
                    onChange={(e) => setAddFormData({...addFormData, condition: e.target.value as 'new' | 'used' | 'refurbished' | 'b-stock'})}
                    className="input"
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="b-stock">B-Stock</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">
                    Purchase Location
                  </label>
                  <input
                    type="text"
                    value={addFormData.purchase_location}
                    onChange={(e) => setAddFormData({...addFormData, purchase_location: e.target.value})}
                    placeholder="e.g., Amazon, Head-Fi, Local store"
                    className="input"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="label">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={addFormData.serial_number}
                    onChange={(e) => setAddFormData({...addFormData, serial_number: e.target.value})}
                    placeholder="Optional"
                    className="input"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="label">
                    Notes
                  </label>
                  <textarea
                    value={addFormData.notes}
                    onChange={(e) => setAddFormData({...addFormData, notes: e.target.value})}
                    placeholder="Any additional notes about this item..."
                    rows={3}
                    className="input"
                  />
                </div>
              </div>

            </div>
            
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false)
                  resetAddForm()
                }}
                className="button button-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddGear}
                disabled={
                  (!isCustomEntry && !selectedComponent) ||
                  (isCustomEntry && (!addFormData.custom_name || !addFormData.custom_brand))
                }
                className="button button-primary"
              >
                Add to Collection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Gear Details Modal */}
      {showDetailsModal && selectedGear && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
          onClick={() => {
            setShowDetailsModal(false)
            setSelectedGear(null)
          }}
        >
          <div 
            className="rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border" 
            style={{backgroundColor: 'var(--background-primary)', borderColor: 'var(--border-default)'}}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Compact Header */}
            <div className="p-4 border-b flex items-center justify-between" 
                 style={{borderColor: 'var(--border-default)'}}>
              <div className="flex items-center gap-3">
                {/* Small icon/image */}
                <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                     style={{backgroundColor: 'var(--background-secondary)'}}>
                  {selectedGear.components?.image_url ? (
                    <Image
                      src={selectedGear.components.image_url}
                      alt={selectedGear.components?.name || 'Gear item'}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  ) : (
                    getCategoryIcon(getGearCategory(selectedGear))
                  )}
                </div>
                
                {/* Title */}
                <div>
                  <h2 className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>
                    {selectedGear.components?.brand || selectedGear.custom_brand} {selectedGear.components?.name || selectedGear.custom_name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-medium" style={{color: 'var(--text-secondary)'}}>
                      {getGearCategory(selectedGear)}
                    </span>
                    {selectedGear.condition && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        selectedGear.condition === 'new' ? 'bg-green-500/20 text-green-500' : 
                        selectedGear.condition === 'used' ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-blue-500/20 text-blue-500'
                      }`}>
                        {selectedGear.condition}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setShowEditModal(true)
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-secondary"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedGear(null)
                  }}
                  className="p-1.5 rounded-lg transition-colors hover:bg-secondary"
                  style={{color: 'var(--text-secondary)'}}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Value Tracking - Fixed for dark mode */}
              {selectedGear.purchase_price && (
                <div className="rounded-lg p-4 border" 
                     style={{
                       backgroundColor: 'var(--background-secondary)',
                       borderColor: 'var(--border-default)'
                     }}>
                  <h3 className="font-semibold mb-3 text-sm" style={{color: 'var(--text-primary)'}}>
                    Value Tracking
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xs mb-1" style={{color: 'var(--text-secondary)'}}>
                        Purchase Price
                      </p>
                      <p className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>
                        ${selectedGear.purchase_price}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs mb-1" style={{color: 'var(--text-secondary)'}}>
                        Current Value
                      </p>
                      <p className="text-lg font-bold" style={{color: 'var(--accent-primary)'}}>
                        ${Math.round(calculateCurrentValue(selectedGear))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs mb-1" style={{color: 'var(--text-secondary)'}}>
                        Change
                      </p>
                      {(() => {
                        const purchasePrice = selectedGear.purchase_price || 0
                        const currentValue = calculateCurrentValue(selectedGear)
                        const change = currentValue - purchasePrice
                        const changePercent = purchasePrice > 0 ? (change / purchasePrice) * 100 : 0
                        return (
                          <div>
                            <p className={`text-lg font-bold ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {change >= 0 ? '+' : ''}${Math.round(change)}
                            </p>
                            <p className={`text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {purchasePrice > 0 ? `${change >= 0 ? '+' : ''}${changePercent.toFixed(1)}%` : ''}
                            </p>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Purchase Information - Compact */}
              <div className="rounded-lg p-4 border" 
                   style={{
                     backgroundColor: 'var(--background-secondary)',
                     borderColor: 'var(--border-default)'
                   }}>
                <h3 className="font-semibold mb-3 text-sm" style={{color: 'var(--text-primary)'}}>
                  Purchase Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedGear.purchase_date && (
                    <div>
                      <p style={{color: 'var(--text-secondary)'}}>Purchase Date</p>
                      <p style={{color: 'var(--text-primary)'}}>
                        {new Date(selectedGear.purchase_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {selectedGear.purchase_location && (
                    <div>
                      <p style={{color: 'var(--text-secondary)'}}>Purchase Location</p>
                      <p style={{color: 'var(--text-primary)'}}>{selectedGear.purchase_location}</p>
                    </div>
                  )}
                  {selectedGear.condition && (
                    <div>
                      <p style={{color: 'var(--text-secondary)'}}>Condition</p>
                      <p style={{color: 'var(--text-primary)'}} className="capitalize">
                        {selectedGear.condition}
                      </p>
                    </div>
                  )}
                  {selectedGear.serial_number && (
                    <div>
                      <p style={{color: 'var(--text-secondary)'}}>Serial Number</p>
                      <p style={{color: 'var(--text-primary)'}}>{selectedGear.serial_number}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Specifications if available */}
              {selectedGear.components && (
                <div className="rounded-lg p-4 border" 
                     style={{
                       backgroundColor: 'var(--background-secondary)',
                       borderColor: 'var(--border-default)'
                     }}>
                  <h3 className="font-semibold mb-3 text-sm" style={{color: 'var(--text-primary)'}}>
                    Specifications
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedGear.components.price_new && (
                      <div>
                        <p style={{color: 'var(--text-secondary)'}}>MSRP</p>
                        <p style={{color: 'var(--text-primary)'}}>
                          ${selectedGear.components.price_new}
                        </p>
                      </div>
                    )}
                    {selectedGear.components.impedance && (
                      <div>
                        <p style={{color: 'var(--text-secondary)'}}>Impedance</p>
                        <p style={{color: 'var(--text-primary)'}}>
                          {selectedGear.components.impedance}Ω
                        </p>
                      </div>
                    )}
                    {selectedGear.components.sound_signature && (
                      <div>
                        <p style={{color: 'var(--text-secondary)'}}>Sound Signature</p>
                        <p style={{color: 'var(--text-primary)'}} className="capitalize">
                          {selectedGear.components.sound_signature}
                        </p>
                      </div>
                    )}
                    {selectedGear.components.budget_tier && (
                      <div>
                        <p style={{color: 'var(--text-secondary)'}}>Budget Tier</p>
                        <p style={{color: 'var(--text-primary)'}} className="capitalize">
                          {selectedGear.components.budget_tier}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes if available */}
              {selectedGear.notes && (
                <div className="rounded-lg p-4 border" 
                     style={{
                       backgroundColor: 'var(--background-secondary)',
                       borderColor: 'var(--border-default)'
                     }}>
                  <h3 className="font-semibold mb-2 text-sm" style={{color: 'var(--text-primary)'}}>
                    Notes
                  </h3>
                  <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                    {selectedGear.notes}
                  </p>
                </div>
              )}

              {/* Why Recommended if available */}
              {selectedGear.components?.why_recommended && (
                <div className="rounded-lg p-4 border" 
                     style={{
                       backgroundColor: 'var(--background-secondary)',
                       borderColor: 'var(--border-default)'
                     }}>
                  <h3 className="font-semibold mb-2 text-sm" style={{color: 'var(--text-primary)'}}>
                    Why It&apos;s Recommended
                  </h3>
                  <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                    {selectedGear.components.why_recommended}
                  </p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t flex gap-3" 
                 style={{borderColor: 'var(--border-default)'}}>
              <button
                onClick={() => {
                  if (confirm('Remove this item from your collection?')) {
                    handleRemoveGear(selectedGear.id)
                    setShowDetailsModal(false)
                    setSelectedGear(null)
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors border"
                style={{
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-secondary)'
                }}
              >
                Remove from Collection
              </button>
              <Link
                href={`/used-market?search=${encodeURIComponent((selectedGear.components?.brand || selectedGear.custom_brand || '') + ' ' + (selectedGear.components?.name || selectedGear.custom_name || ''))}`}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors text-center"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white'
                }}
              >
                Find on Used Market
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Create Stack Modal */}
      {showCreateStackModal && (
        <div 
          className="modal-backdrop animate-fadeIn"
          onClick={() => {
            setShowCreateStackModal(false)
            setNewStackName('')
            setNewStackDescription('')
          }}
        >
          <div 
            className="modal-container animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Create New Stack</h2>
              <button
                onClick={() => {
                  setShowCreateStackModal(false)
                  setNewStackName('')
                  setNewStackDescription('')
                }}
                className="modal-close"
                aria-label="Close create stack modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body">
              <p className="form-helper">* Required fields</p>
              
              <div className="form-group">
                <label className="label label-required">Stack Name</label>
                <input
                  type="text"
                  value={newStackName}
                  onChange={(e) => setNewStackName(e.target.value)}
                  placeholder="e.g., Desktop Setup, Portable Rig"
                  className="input"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="label">Description</label>
                <textarea
                  value={newStackDescription}
                  onChange={(e) => setNewStackDescription(e.target.value)}
                  placeholder="Describe your stack..."
                  className="input"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="label">Purpose</label>
                <select
                  value={newStackPurpose}
                  onChange={(e) => setNewStackPurpose(e.target.value as StackPurpose)}
                  className="input"
                >
                  <option value="general">General</option>
                  <option value="desktop">Desktop</option>
                  <option value="portable">Portable</option>
                  <option value="studio">Studio</option>
                  <option value="gaming">Gaming</option>
                  <option value="office">Office</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Categorize your stack by its primary use case
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => {
                  setShowCreateStackModal(false)
                  setNewStackName('')
                  setNewStackDescription('')
                  setNewStackPurpose('general')
                }}
                className="button button-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateStack}
                disabled={!newStackName.trim()}
                className="button button-primary"
              >
                Create Stack
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Gear Modal */}
      {showEditModal && selectedGear && (
        <div 
          className="modal-backdrop animate-fadeIn"
          onClick={() => {
            setShowEditModal(false)
            setSelectedGear(null)
          }}
        >
          <div 
            className="modal-container animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Edit Gear</h2>
                <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
                  {selectedGear.components?.brand || selectedGear.custom_brand} {selectedGear.components?.name || selectedGear.custom_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedGear(null)
                }}
                className="modal-close"
                aria-label="Close edit modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="modal-body">
              {/* Custom Entry Fields - Only show if this is a custom entry */}
              {(selectedGear.custom_name || selectedGear.custom_brand) && (
                <>
                  <h3 className="heading-4 mb-4">Product Information</h3>
                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label className="label">Brand</label>
                      <input
                        type="text"
                        value={editFormData.custom_brand}
                        onChange={(e) => setEditFormData({...editFormData, custom_brand: e.target.value})}
                        className="input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">Model</label>
                      <input
                        type="text"
                        value={editFormData.custom_name}
                        onChange={(e) => setEditFormData({...editFormData, custom_name: e.target.value})}
                        className="input"
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="label">Category</label>
                      <select
                        value={editFormData.custom_category}
                        onChange={(e) => setEditFormData({...editFormData, custom_category: e.target.value})}
                        className="input"
                      >
                        <option value="headphones">Headphones</option>
                        <option value="iems">IEMs</option>
                        <option value="dacs">DAC</option>
                        <option value="amps">Amplifier</option>
                        <option value="combo">DAC/Amp Combo</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Purchase Details */}
              <h3 className="heading-4 mb-4">Purchase Details</h3>
              <div className="form-grid form-grid-2">
                <div className="form-group">
                  <label className="label">Purchase Date</label>
                  <input
                    type="date"
                    value={editFormData.purchase_date}
                    onChange={(e) => setEditFormData({...editFormData, purchase_date: e.target.value})}
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Price Paid</label>
                  <input
                    type="number"
                    value={editFormData.purchase_price}
                    onChange={(e) => setEditFormData({...editFormData, purchase_price: e.target.value})}
                    placeholder="0.00"
                    className="input"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Condition</label>
                  <select
                    value={editFormData.condition}
                    onChange={(e) => setEditFormData({...editFormData, condition: e.target.value as 'new' | 'used' | 'refurbished' | 'b-stock'})}
                    className="input"
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="b-stock">B-Stock</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Purchase Location</label>
                  <input
                    type="text"
                    value={editFormData.purchase_location}
                    onChange={(e) => setEditFormData({...editFormData, purchase_location: e.target.value})}
                    placeholder="e.g., Amazon, Head-Fi, Local store"
                    className="input"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="label">Serial Number</label>
                  <input
                    type="text"
                    value={editFormData.serial_number}
                    onChange={(e) => setEditFormData({...editFormData, serial_number: e.target.value})}
                    placeholder="Optional"
                    className="input"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="label">Notes</label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                    placeholder="Any additional notes about this item..."
                    rows={3}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedGear(null)
                }}
                className="button button-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditGear}
                className="button button-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Gear to Stack Modal */}
      {showAddGearModal && selectedStackForGear && (
        <div 
          className="modal-backdrop animate-fadeIn"
          onClick={() => {
            setShowAddGearModal(false)
            setSelectedStackForGear(null)
          }}
        >
          <div 
            className="modal-container animate-scaleIn max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header flex-shrink-0">
              <div>
                <h2 className="modal-title">Add Gear to &ldquo;{selectedStackForGear.name}&rdquo;</h2>
                <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
                  Select gear from your collection to add to this stack
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddGearModal(false)
                  setSelectedStackForGear(null)
                }}
                className="modal-close"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body flex-1 overflow-y-auto">
              {(() => {
                // Get gear that's not already in this stack
                const stackGearIds = selectedStackForGear.stack_components.map(c => c.user_gear_id)
                const availableGear = gear.filter(item => !stackGearIds.includes(item.id))
                
                if (availableGear.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Package className="w-16 h-16 text-secondary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-primary mb-2">All gear already added</h3>
                      <p className="text-secondary">
                        All your gear is already in this stack, or you don&apos;t have any gear to add.
                      </p>
                    </div>
                  )
                }

                // Group gear by category
                const gearByCategory: Record<string, UserGearItem[]> = {}
                availableGear.forEach(item => {
                  const category = getGearCategory(item)
                  if (!gearByCategory[category]) {
                    gearByCategory[category] = []
                  }
                  gearByCategory[category].push(item)
                })

                return (
                  <div className="space-y-6">
                    {Object.entries(gearByCategory).map(([category, items]) => (
                      <div key={category}>
                        <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                          {getCategoryIcon(category)}
                          {category.charAt(0).toUpperCase() + category.slice(1)} ({items.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {items.map(item => (
                            <div
                              key={item.id}
                              className="card p-4 hover:shadow-lg transition-all cursor-pointer hover:border-accent"
                              onClick={async () => {
                                try {
                                  await addGearToStackAPI(selectedStackForGear.id, item.id)
                                  await loadData()
                                  setShowAddGearModal(false)
                                  setSelectedStackForGear(null)
                                } catch (error: unknown) {
                                  const errorMessage = error instanceof Error ? error.message : 'Failed to add gear to stack'
                                  alert(errorMessage)
                                }
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-secondary rounded flex items-center justify-center opacity-60">
                                  {getCategoryIcon(item.components?.category || item.custom_category || 'other')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate" style={{color: 'var(--text-primary)'}}>
                                    {item.components?.brand || item.custom_brand} {item.components?.name || item.custom_name}
                                  </div>
                                  <div className="text-xs truncate" style={{color: 'var(--text-secondary)'}}>
                                    {item.components?.category || item.custom_category}
                                  </div>
                                  {item.purchase_price && (
                                    <div className="text-xs font-semibold mt-1" style={{color: 'var(--accent-primary)'}}>
                                      ${item.purchase_price}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowAddGearModal(false)
                  setSelectedStackForGear(null)
                }}
                className="button button-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stack Modal */}
      {showEditStackModal && selectedStackForEdit && (
        <div 
          className="modal-backdrop animate-fadeIn"
          onClick={() => {
            setShowEditStackModal(false)
            setSelectedStackForEdit(null)
            setEditStackName('')
            setEditStackDescription('')
          }}
        >
          <div 
            className="modal-container animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Edit Stack</h2>
                <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
                  Update your stack name and description
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEditStackModal(false)
                  setSelectedStackForEdit(null)
                  setEditStackName('')
                  setEditStackDescription('')
                }}
                className="modal-close"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleEditStack() }}>
                <div className="space-y-4">
                  <div>
                    <label className="form-label" htmlFor="edit-stack-name">
                      Stack Name *
                    </label>
                    <input
                      id="edit-stack-name"
                      type="text"
                      value={editStackName}
                      onChange={(e) => setEditStackName(e.target.value)}
                      className="form-input"
                      placeholder="e.g., Desktop Setup, Portable Rig"
                      required
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="edit-stack-description">
                      Description (Optional)
                    </label>
                    <textarea
                      id="edit-stack-description"
                      value={editStackDescription}
                      onChange={(e) => setEditStackDescription(e.target.value)}
                      className="form-input"
                      placeholder="Describe this setup..."
                      rows={3}
                      maxLength={500}
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => {
                  setShowEditStackModal(false)
                  setSelectedStackForEdit(null)
                  setEditStackName('')
                  setEditStackDescription('')
                }}
                className="button button-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditStack}
                disabled={!editStackName.trim()}
                className="button button-primary"
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

export default function GearPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GearContent />
    </Suspense>
  )
}
