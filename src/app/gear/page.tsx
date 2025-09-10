'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { getUserGear, addGearItem, updateGearItem, removeGearItem, calculateCollectionValue, UserGearItem, getUniqueBrands, findSimilarStrings } from '@/lib/gear'
import { getUserStacks, createStack, deleteStack, removeGearFromStack, calculateStackValue, StackWithGear } from '@/lib/stacks'
import { supabase } from '@/lib/supabase'
import { Component, CollectionStats } from '@/types'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Package, 
  Search,
  X,
  Headphones,
  Cpu,
  Speaker,
  Cable,
  Layers,
  Edit2,
  Trash2,
  Plus as PlusIcon,
  MoreVertical
} from 'lucide-react'
import { GearPageHeader } from '@/components/gear/GearPageHeader'
import { GearFilters } from '@/components/gear/GearFilters'

type ViewMode = 'grid' | 'list' | 'stacks'
type CategoryFilter = 'all' | 'headphones' | 'iems' | 'dacs' | 'amps' | 'combo'


// Brand Combobox Component
interface BrandComboboxProps {
  value: string
  onChange: (value: string) => void
  availableBrands: string[]
  placeholder?: string
  className?: string
  style?: React.CSSProperties
}

function BrandCombobox({ value, onChange, availableBrands, placeholder, className, style }: BrandComboboxProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredBrands, setFilteredBrands] = useState<string[]>([])
  const [similarBrands, setSimilarBrands] = useState<string[]>([])

  useEffect(() => {
    if (value.length > 0) {
      // Filter brands that contain the typed text
      const filtered = availableBrands.filter(brand => 
        brand.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredBrands(filtered)

      // Find similar brands for typo detection
      const similar = findSimilarStrings(value, availableBrands, 0.6)
      setSimilarBrands(similar)
    } else {
      setFilteredBrands(availableBrands.slice(0, 10)) // Show first 10 brands
      setSimilarBrands([])
    }
  }, [value, availableBrands])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setShowSuggestions(true)
  }

  const handleBrandSelect = (brand: string) => {
    onChange(brand)
    setShowSuggestions(false)
  }

  const handleInputFocus = () => {
    setShowSuggestions(true)
  }

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => setShowSuggestions(false), 150)
  }

  return (
    <div className={`relative ${showSuggestions && (filteredBrands.length > 0 || similarBrands.length > 0) ? 'mb-16' : ''}`}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        className={className}
        style={style}
        placeholder={placeholder}
      />
      
      {/* Suggestions Dropdown */}
      {showSuggestions && (filteredBrands.length > 0 || similarBrands.length > 0) && (
        <div
          className="absolute z-[60] w-full mt-1 rounded-md border shadow-lg max-h-60 overflow-y-auto"
          style={{
            backgroundColor: 'var(--background-secondary)',
            borderColor: 'var(--border-default)',
            top: '100%',
            left: 0,
            right: 0
          }}
        >
          {/* Exact/partial matches */}
          {filteredBrands.length > 0 && (
            <div>
              {filteredBrands.slice(0, 8).map((brand) => (
                <div
                  key={brand}
                  className="px-3 py-2 cursor-pointer hover:bg-tertiary transition-colors text-sm"
                  style={{color: 'var(--text-primary)'}}
                  onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                  onClick={() => handleBrandSelect(brand)}
                >
                  {brand}
                </div>
              ))}
            </div>
          )}
          
          {/* Similar brands warning */}
          {similarBrands.length > 0 && !filteredBrands.some(b => b.toLowerCase() === value.toLowerCase()) && (
            <div className="border-t" style={{borderColor: 'var(--border-default)'}}>
              <div className="px-3 py-2 text-xs font-medium" style={{color: 'var(--text-secondary)'}}>
                Did you mean?
              </div>
              {similarBrands.slice(0, 3).map((brand) => (
                <div
                  key={brand}
                  className="px-3 py-2 cursor-pointer hover:bg-tertiary transition-colors text-sm"
                  style={{color: 'var(--warning)'}}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBrandSelect(brand)}
                >
                  {brand}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper function to get the category of a gear item
function getGearCategory(item: UserGearItem): CategoryFilter {
  // Check custom category first (for manually added items)
  if (item.custom_category) {
    // Map old dac_amp to combo
    const category = item.custom_category === 'dac_amp' ? 'combo' : item.custom_category
    // Ensure it's a valid CategoryFilter, default to 'headphones' if not
    return ['headphones', 'iems', 'dacs', 'amps', 'combo'].includes(category) 
      ? category as CategoryFilter 
      : 'headphones'
  }
  // Fall back to components category (for database items)
  const category = item.components?.category || 'headphones'
  // Map old dac_amp to combo
  const mappedCategory = category === 'dac_amp' ? 'combo' : category
  // Ensure it's a valid CategoryFilter, default to 'headphones' if not
  return ['headphones', 'iems', 'dacs', 'amps', 'combo'].includes(mappedCategory) 
    ? mappedCategory as CategoryFilter 
    : 'headphones'
}

// Helper function to calculate current value of gear item
function calculateCurrentValue(item: UserGearItem): number {
  if (item.components?.price_used_min && item.components?.price_used_max) {
    return (item.components.price_used_min + item.components.price_used_max) / 2
  }
  if (item.components?.price_new) {
    return item.components.price_new * 0.7 // 70% of new price
  }
  return item.purchase_price || 0
}

// Helper function to get the category icon
function getCategoryIcon(category: string) {
  switch (category) {
    case 'headphones':
    case 'iems':
      return <Headphones className="w-5 h-5" />
    case 'dacs':
      return <Cpu className="w-5 h-5" />
    case 'amps':
    case 'combo':
      return <Speaker className="w-5 h-5" />
    default:
      return <Cable className="w-5 h-5" />
  }
}


function GearContent() {
  const { data: session } = useSession()
  const [gear, setGear] = useState<UserGearItem[]>([])
  const [stacks, setStacks] = useState<StackWithGear[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeFilters, setActiveFilters] = useState<Set<CategoryFilter>>(new Set())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateStackModal, setShowCreateStackModal] = useState(false)
  const [selectedGear, setSelectedGear] = useState<UserGearItem | null>(null)
  const [collectionStats, setCollectionStats] = useState<CollectionStats | null>(null)
  const [newStackName, setNewStackName] = useState('')
  const [newStackDescription, setNewStackDescription] = useState('')
  
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
    const [gearItems, stackItems] = await Promise.all([
      getUserGear(session.user.id),
      getUserStacks(session.user.id)
    ])
    
    setGear(gearItems)
    setStacks(stackItems)
    
    // Calculate stats
    const stats = await calculateCollectionValue(gearItems)
    setCollectionStats(stats)
    
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
      const brands = await getUniqueBrands()
      setAvailableBrands(brands)
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
      const newItem = await addGearItem(session.user.id, gearData)
      console.log('📦 Add result:', newItem);
      
      if (newItem) {
        console.log('✅ Success! Reloading gear...');
        await loadData()
        setShowAddModal(false)
        resetAddForm()
      } else {
        console.log('❌ Add failed - no item returned');
        alert('Failed to add gear item. Check console for details.');
      }
    } catch (error) {
      console.error('❌ Exception in handleAddGear:', error);
      alert('Error adding gear: ' + error);
    }
  }

  const handleRemoveGear = async (gearId: string) => {
    if (!session?.user?.id) return
    
    const success = await removeGearItem(session.user.id, gearId)
    if (success) {
      await loadData()
    }
  }

  const handleCreateStack = async () => {
    if (!session?.user?.id || !newStackName.trim()) return
    
    const success = await createStack(
      session.user.id, 
      newStackName.trim(),
      newStackDescription.trim() || undefined
    )
    
    if (success) {
      await loadData()
      setShowCreateStackModal(false)
      setNewStackName('')
      setNewStackDescription('')
    }
  }

  const handleEditGear = async () => {
    if (!session?.user?.id || !selectedGear) return
    
    const updateData: Partial<UserGearItem> = {
      purchase_date: editFormData.purchase_date || null,
      purchase_price: editFormData.purchase_price ? parseFloat(editFormData.purchase_price) : null,
      purchase_location: editFormData.purchase_location || null,
      condition: editFormData.condition,
      serial_number: editFormData.serial_number || null,
      notes: editFormData.notes || null
    }

    // Only update custom fields if this is a custom entry
    if (selectedGear.custom_name || selectedGear.custom_brand) {
      updateData.custom_name = editFormData.custom_name || null
      updateData.custom_brand = editFormData.custom_brand || null
      updateData.custom_category = editFormData.custom_category || null
    }
    
    const success = await updateGearItem(session.user.id, selectedGear.id, updateData)
    if (success) {
      await loadData()
      setShowEditModal(false)
      setSelectedGear(null)
    }
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
      <div className="sticky top-[120px] z-10 border-b border-border-default" style={{backgroundColor: 'var(--background-primary)'}}>
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
        <div className="pt-6 relative">
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
                  <div className="text-center py-12">
                    <Layers className="w-16 h-16 text-secondary mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-primary mb-2">No stacks yet</h2>
                    <p className="text-secondary mb-6">Create your first stack to group related gear together</p>
                    <button
                      onClick={() => setShowCreateStackModal(true)}
                      className="button button-primary"
                    >
                      Create Your First Stack
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {stacks.map(stack => {
                      const stackStats = calculateStackValue(stack)
                      return (
                        <div key={stack.id} className="card p-6">
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
                                  // TODO: Edit stack functionality
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
                                      await removeGearFromStack(stack.id, component.user_gear_id)
                                      loadData()
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

                          {/* Add Gear to Stack */}
                          <button
                            onClick={() => {
                              // TODO: Add gear to stack modal
                            }}
                            className="w-full mt-3 p-2 border-2 border-dashed border-secondary rounded text-secondary hover:text-primary hover:border-primary transition-colors text-sm"
                          >
                            + Add Gear to Stack
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Ungrouped Gear */}
                {(() => {
                  // Filter ungrouped gear by category
                  const ungroupedGear = gear.filter(item => !stacks.some(stack => stack.stack_components.some(comp => comp.user_gear_id === item.id)))
                  const filteredUngroupedGear = activeFilters.size === 0 
                    ? ungroupedGear 
                    : ungroupedGear.filter(item => activeFilters.has(getGearCategory(item)))
                  
                  return filteredUngroupedGear.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
                        Individual Gear ({filteredUngroupedGear.length})
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {filteredUngroupedGear.map(item => (
                          <div
                            key={item.id}
                            className="card p-3 hover:shadow-lg transition-all cursor-pointer"
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
                className="card hover:shadow-lg transition-all cursor-pointer"
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAddModal(false)
            resetAddForm()
          }}
        >
          <div 
            className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border" 
            style={{backgroundColor: 'var(--background-primary)', borderColor: 'var(--border-default)'}}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b" style={{borderColor: 'var(--border-default)'}}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Gear</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetAddForm()
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Toggle between search and custom entry */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setIsCustomEntry(false)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                    !isCustomEntry 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Search Database
                </button>
                <button
                  onClick={() => setIsCustomEntry(true)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                    isCustomEntry 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Custom Entry
                </button>
              </div>

              {!isCustomEntry ? (
                <>
                  {/* Component Search */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
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
                        className="w-full pl-4 pr-10 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 max-h-48 overflow-y-auto shadow-lg">
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
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex justify-between border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                          >
                            <span className="text-gray-900 dark:text-gray-100 font-medium">{component.brand} {component.name}</span>
                            <span className="text-gray-500 dark:text-gray-400 text-sm capitalize">{component.category}</span>
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
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                        Brand *
                      </label>
                      <BrandCombobox
                        value={addFormData.custom_brand}
                        onChange={(value) => setAddFormData({...addFormData, custom_brand: value})}
                        availableBrands={availableBrands}
                        placeholder="Search existing brands or enter new..."
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                        Model *
                      </label>
                      <input
                        type="text"
                        value={addFormData.custom_name}
                        onChange={(e) => setAddFormData({...addFormData, custom_name: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <select
                        value={addFormData.custom_category}
                        onChange={(e) => setAddFormData({...addFormData, custom_category: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Purchase Details</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={addFormData.purchase_date}
                    onChange={(e) => setAddFormData({...addFormData, purchase_date: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                    Price Paid
                  </label>
                  <input
                    type="number"
                    value={addFormData.purchase_price}
                    onChange={(e) => setAddFormData({...addFormData, purchase_price: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                    Condition
                  </label>
                  <select
                    value={addFormData.condition}
                    onChange={(e) => setAddFormData({...addFormData, condition: e.target.value as 'new' | 'used' | 'refurbished' | 'b-stock'})}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="b-stock">B-Stock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                    Purchase Location
                  </label>
                  <input
                    type="text"
                    value={addFormData.purchase_location}
                    onChange={(e) => setAddFormData({...addFormData, purchase_location: e.target.value})}
                    placeholder="e.g., Amazon, Head-Fi, Local store"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={addFormData.serial_number}
                    onChange={(e) => setAddFormData({...addFormData, serial_number: e.target.value})}
                    placeholder="Optional"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={addFormData.notes}
                    onChange={(e) => setAddFormData({...addFormData, notes: e.target.value})}
                    placeholder="Any additional notes about this item..."
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetAddForm()
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddGear}
                  disabled={
                    (!isCustomEntry && !selectedComponent) ||
                    (isCustomEntry && (!addFormData.custom_name || !addFormData.custom_brand))
                  }
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add to Collection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Gear Details Modal */}
      {showDetailsModal && selectedGear && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowCreateStackModal(false)
            setNewStackName('')
            setNewStackDescription('')
          }}
        >
          <div 
            className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border" 
            style={{backgroundColor: 'var(--background-primary)', borderColor: 'var(--border-default)'}}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b" style={{borderColor: 'var(--border-default)'}}>
              <h2 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>
                Create New Stack
              </h2>
              <button
                onClick={() => {
                  setShowCreateStackModal(false)
                  setNewStackName('')
                  setNewStackDescription('')
                }}
                className="p-2 hover:bg-secondary rounded-full transition-colors"
              >
                <X className="w-5 h-5" style={{color: 'var(--text-secondary)'}} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                  Stack Name *
                </label>
                <input
                  type="text"
                  value={newStackName}
                  onChange={(e) => setNewStackName(e.target.value)}
                  placeholder="e.g., Desktop Setup, Portable Rig"
                  className="w-full px-3 py-2 rounded-md border text-sm"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                  Description (Optional)
                </label>
                <textarea
                  value={newStackDescription}
                  onChange={(e) => setNewStackDescription(e.target.value)}
                  placeholder="Describe your stack..."
                  className="w-full px-3 py-2 rounded-md border text-sm h-20 resize-vertical"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t" style={{borderColor: 'var(--border-default)'}}>
              <button
                onClick={() => {
                  setShowCreateStackModal(false)
                  setNewStackName('')
                  setNewStackDescription('')
                }}
                className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                style={{
                  backgroundColor: 'var(--background-secondary)',
                  color: 'var(--text-secondary)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateStack}
                disabled={!newStackName.trim()}
                className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{backgroundColor: 'var(--accent-primary)'}}
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowEditModal(false)
            setSelectedGear(null)
          }}
        >
          <div 
            className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border" 
            style={{backgroundColor: 'var(--background-primary)', borderColor: 'var(--border-default)'}}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b" style={{borderColor: 'var(--border-default)'}}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>
                  Edit Gear
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedGear(null)
                  }}
                  className="p-2 hover:bg-secondary rounded-full transition-colors"
                  style={{color: 'var(--text-secondary)'}}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm mt-2" style={{color: 'var(--text-secondary)'}}>
                {selectedGear.components?.brand || selectedGear.custom_brand} {selectedGear.components?.name || selectedGear.custom_name}
              </p>
            </div>

            <div className="p-6">
              {/* Custom Entry Fields - Only show if this is a custom entry */}
              {(selectedGear.custom_name || selectedGear.custom_brand) && (
                <>
                  <h3 className="font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
                    Product Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                        Brand
                      </label>
                      <input
                        type="text"
                        value={editFormData.custom_brand}
                        onChange={(e) => setEditFormData({...editFormData, custom_brand: e.target.value})}
                        className="w-full px-3 py-2 rounded-md border text-sm"
                        style={{
                          backgroundColor: 'var(--background-secondary)',
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                        Model
                      </label>
                      <input
                        type="text"
                        value={editFormData.custom_name}
                        onChange={(e) => setEditFormData({...editFormData, custom_name: e.target.value})}
                        className="w-full px-3 py-2 rounded-md border text-sm"
                        style={{
                          backgroundColor: 'var(--background-secondary)',
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                        Category
                      </label>
                      <select
                        value={editFormData.custom_category}
                        onChange={(e) => setEditFormData({...editFormData, custom_category: e.target.value})}
                        className="w-full px-3 py-2 rounded-md border text-sm"
                        style={{
                          backgroundColor: 'var(--background-secondary)',
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-primary)'
                        }}
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
              <h3 className="font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
                Purchase Details
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={editFormData.purchase_date}
                    onChange={(e) => setEditFormData({...editFormData, purchase_date: e.target.value})}
                    className="w-full px-3 py-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                    Price Paid
                  </label>
                  <input
                    type="number"
                    value={editFormData.purchase_price}
                    onChange={(e) => setEditFormData({...editFormData, purchase_price: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                    Condition
                  </label>
                  <select
                    value={editFormData.condition}
                    onChange={(e) => setEditFormData({...editFormData, condition: e.target.value as 'new' | 'used' | 'refurbished' | 'b-stock'})}
                    className="w-full px-3 py-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="b-stock">B-Stock</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                    Purchase Location
                  </label>
                  <input
                    type="text"
                    value={editFormData.purchase_location}
                    onChange={(e) => setEditFormData({...editFormData, purchase_location: e.target.value})}
                    placeholder="e.g., Amazon, Head-Fi, Local store"
                    className="w-full px-3 py-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={editFormData.serial_number}
                    onChange={(e) => setEditFormData({...editFormData, serial_number: e.target.value})}
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-md border text-sm"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                    Notes
                  </label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                    placeholder="Any additional notes about this item..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-md border text-sm resize-none"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedGear(null)
                  }}
                  className="flex-1 px-4 py-2.5 rounded-md font-medium transition-colors border"
                  style={{
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditGear}
                  className="flex-1 px-4 py-2.5 rounded-md font-medium transition-colors text-white"
                  style={{backgroundColor: 'var(--accent-primary)'}}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GearPage() {
  return <GearContent />
}
