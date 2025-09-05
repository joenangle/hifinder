'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { getUserGear, addGearItem, updateGearItem, removeGearItem, calculateCollectionValue, UserGearItem, getUniqueBrands, findSimilarStrings } from '@/lib/gear'
import { getUserStacks, createStack, deleteStack, removeGearFromStack, calculateStackValue, StackWithGear } from '@/lib/stacks'
import { supabase } from '@/lib/supabase'
import { Component, CollectionStats } from '@/types'
import Link from 'next/link'
import Image from 'next/image'
import { 
  ArrowLeft, 
  Plus, 
  Grid3X3, 
  List, 
  Package, 
  DollarSign, 
  TrendingDown,
  Search,
  X,
  Calendar,
  MapPin,
  FileText,
  Download,
  AlertCircle,
  Headphones,
  Cpu,
  Speaker,
  Cable,
  Layers,
  Edit2,
  Trash2,
  Plus as PlusIcon
} from 'lucide-react'

type ViewMode = 'grid' | 'list' | 'stacks'
type CategoryFilter = 'all' | 'headphones' | 'iems' | 'dacs' | 'amps' | 'combo'

// Category configurations with icons and labels
const CATEGORIES = {
  all: { label: 'All Gear', icon: Package },
  headphones: { label: 'Headphones', icon: Headphones },
  iems: { label: 'IEMs', icon: Headphones },
  dacs: { label: 'DACs', icon: Cpu },
  amps: { label: 'Amplifiers', icon: Speaker },
  combo: { label: 'Combos', icon: Cpu }
} as const

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
function getGearCategory(item: UserGearItem): string {
  // Check custom category first (for manually added items)
  if (item.custom_category) {
    // Map old dac_amp to combo
    return item.custom_category === 'dac_amp' ? 'combo' : item.custom_category
  }
  // Fall back to components category (for database items)
  const category = item.components?.category || 'other'
  // Map old dac_amp to combo
  return category === 'dac_amp' ? 'combo' : category
}

function GearContent() {
  const { data: session } = useSession()
  const [gear, setGear] = useState<UserGearItem[]>([])
  const [stacks, setStacks] = useState<StackWithGear[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'headphones': return <Headphones className="w-5 h-5" />
      case 'dacs': return <Cpu className="w-5 h-5" />
      case 'amps': 
      case 'combo': return <Speaker className="w-5 h-5" />
      default: return <Cable className="w-5 h-5" />
    }
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

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--background-primary)', color: 'var(--text-primary)'}}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/" className="text-secondary hover:text-primary transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="heading-1" style={{color: 'var(--text-primary)'}}>My Gear</h1>
            </div>
            <p style={{color: 'var(--text-secondary)'}}>
              {gear.length} {gear.length === 1 ? 'item' : 'items'} in your collection
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={exportCollection}
              className="p-2 rounded-md bg-secondary hover:bg-tertiary text-secondary hover:text-primary transition-colors"
              title="Export Collection"
            >
              <Download className="w-5 h-5" />
            </button>
            <div className="flex rounded-md overflow-hidden bg-secondary">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-secondary hover:text-primary hover:bg-tertiary'}`}
                title="Grid View"
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-accent text-white' : 'text-secondary hover:text-primary hover:bg-tertiary'}`}
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('stacks')}
                className={`p-2 transition-colors ${viewMode === 'stacks' ? 'bg-accent text-white' : 'text-secondary hover:text-primary hover:bg-tertiary'}`}
                title="Stacks View"
              >
                <Layers className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="button button-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Gear
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {collectionStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm mb-1" style={{color: 'var(--text-secondary)'}}>
                    {categoryFilter === 'all' ? 'Total Items' : `${CATEGORIES[categoryFilter].label}`}
                  </p>
                  <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
                    {categoryFilter === 'all' ? gear.length : gear.filter(item => getGearCategory(item) === categoryFilter).length}
                  </p>
                  {categoryFilter !== 'all' && (
                    <p className="text-xs" style={{color: 'var(--text-tertiary)'}}>of {gear.length} total</p>
                  )}
                </div>
                <Package className="w-8 h-8 text-accent" />
              </div>
            </div>
          
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm mb-1" style={{color: 'var(--text-secondary)'}}>Total Invested</p>
                  <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
                    {formatCurrency(collectionStats.totalPaid)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8" style={{color: 'var(--success)'}} />
              </div>
            </div>
            
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm mb-1" style={{color: 'var(--text-secondary)'}}>Current Value</p>
                  <p className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>
                    {formatCurrency(collectionStats.currentValue)}
                  </p>
                </div>
                <TrendingDown className="w-8 h-8" style={{color: 'var(--warning)'}} />
              </div>
            </div>
            
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm mb-1" style={{color: 'var(--text-secondary)'}}>Depreciation</p>
                  <p className="text-2xl font-bold" style={{color: 'var(--error)'}}>
                    -{formatCurrency(Math.abs(collectionStats.depreciation))}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8" style={{color: 'var(--error)'}} />
              </div>
            </div>
          </div>
        )}

        {/* Category Filter Section */}
        <div className="mb-8">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>
                  Filter by Category
                </h3>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  Browse your gear by type or view everything at once
                </p>
              </div>
              <div className="text-sm" style={{color: 'var(--text-tertiary)'}}>
                {categoryFilter === 'all' ? `${gear.length} total items` : 
                  `${gear.filter(item => getGearCategory(item) === categoryFilter).length} of ${gear.length} items`}
              </div>
            </div>
          </div>
          <div 
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: 'var(--background-secondary)',
              borderColor: 'var(--border-default)'
            }}
          >
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORIES).map(([key, config]) => {
                const IconComponent = config.icon
                const isActive = categoryFilter === key
                const categoryGear = key === 'all' ? gear : gear.filter(item => getGearCategory(item) === key)
                
                return (
                  <button
                    key={key}
                    onClick={() => setCategoryFilter(key as CategoryFilter)}
                    className={`
                      flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all border-2
                      ${isActive 
                        ? 'text-white border-transparent shadow-md' 
                        : 'text-secondary hover:text-primary border-transparent hover:border-accent/20'
                      }
                    `}
                    style={{
                      backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--background-primary)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'var(--accent-primary)'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'transparent'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }
                    }}
                    title={`View ${config.label.toLowerCase()} (${categoryGear.length} items)`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{config.label}</span>
                    <span 
                      className="text-xs px-2 py-1 rounded-full font-semibold min-w-[24px] text-center"
                      style={{
                        backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--accent-primary)',
                        color: isActive ? 'white' : 'white'
                      }}
                    >
                      {categoryGear.length}
                    </span>
                  </button>
                )
              })}
            </div>
            {/* Quick tip for first-time users */}
            {gear.length > 0 && (
              <div className="mt-3 pt-3 border-t" style={{borderColor: 'var(--border-light)'}}>
                <p className="text-xs flex items-center gap-1" style={{color: 'var(--text-tertiary)'}}>
                  <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
                  Click any category to filter your gear collection
                </p>
              </div>
            )}
          </div>
        </div>

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
                  const filteredUngroupedGear = categoryFilter === 'all' 
                    ? ungroupedGear 
                    : ungroupedGear.filter(item => getGearCategory(item) === categoryFilter)
                  
                  return filteredUngroupedGear.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--text-primary)'}}>
                        Individual Gear ({filteredUngroupedGear.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredUngroupedGear.map(item => (
                          <div
                            key={item.id}
                            className="card p-4 hover:shadow-lg transition-all cursor-pointer"
                            onClick={() => {
                              setSelectedGear(item)
                              setShowDetailsModal(true)
                            }}
                          >
                            <div className="text-center">
                              <div className="w-12 h-12 mx-auto mb-2 bg-secondary rounded flex items-center justify-center">
                                {getCategoryIcon(item.components?.category || item.custom_category || 'other')}
                              </div>
                              <div className="font-medium text-sm" style={{color: 'var(--text-primary)'}}>
                                {item.components?.brand || item.custom_brand}
                              </div>
                              <div className="text-xs" style={{color: 'var(--text-secondary)'}}>
                                {item.components?.name || item.custom_name}
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                  )
                })()}
              </div>
            )
          }

          // Grid/List View (existing logic)
          const filteredGear = categoryFilter === 'all' 
            ? gear 
            : gear.filter(item => getGearCategory(item) === categoryFilter)

          return filteredGear.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-secondary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-primary mb-2">
                {categoryFilter === 'all' ? 'No gear yet' : `No ${CATEGORIES[categoryFilter].label.toLowerCase()}`}
              </h2>
              <p className="text-secondary mb-6">
                {categoryFilter === 'all' 
                  ? 'Start building your collection by adding your first item'
                  : `You don't have any ${CATEGORIES[categoryFilter].label.toLowerCase()} in your collection yet`
                }
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="button button-primary"
              >
                {categoryFilter === 'all' ? 'Add Your First Item' : `Add ${CATEGORIES[categoryFilter].label}`}
              </button>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
              : 'space-y-4'
            }>
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
                    {/* Grid View */}
                    <div className="aspect-square bg-secondary rounded-t-lg p-4 flex items-center justify-center">
                      {item.components?.image_url ? (
                        <Image
                          src={item.components.image_url}
                          alt={item.components.name}
                          width={400}
                          height={400}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        getCategoryIcon(item.components?.category || item.custom_category || 'other')
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1" style={{color: 'var(--text-primary)'}}>
                            {item.components?.brand || item.custom_brand}
                          </h3>
                          <p className="text-sm mb-2" style={{color: 'var(--text-secondary)'}}>
                            {item.components?.name || item.custom_name}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedGear(item)
                            setShowEditModal(true)
                          }}
                          className="px-2 py-2.5 rounded-md shadow-sm border transition-all hover:shadow-md group"
                          style={{
                            backgroundColor: 'var(--background-secondary)',
                            borderColor: 'var(--border-default)',
                            color: 'var(--text-secondary)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--accent-primary)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-default)'
                          }}
                          title="Edit gear"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                      {item.purchase_price && (
                        <p className="text-lg font-bold mb-2" style={{color: 'var(--accent-primary)'}}>
                          {formatCurrency(item.purchase_price)}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          item.condition === 'new' ? 'bg-green-500/20 text-green-500' : 
                          item.condition === 'used' ? 'bg-yellow-500/20 text-yellow-500' :
                          'bg-blue-500/20 text-blue-500'
                        }`}>
                          {item.condition}
                        </span>
                        {item.is_loaned && (
                          <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-500">
                            Loaned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4">
                    {/* List View */}
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-secondary rounded flex items-center justify-center">
                        {getCategoryIcon(item.components?.category || item.custom_category || 'other')}
                      </div>
                      <div>
                        <h3 className="font-semibold" style={{color: 'var(--text-primary)'}}>
                          {item.components?.brand || item.custom_brand} {item.components?.name || item.custom_name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm mt-1" style={{color: 'var(--text-secondary)'}}>
                          {item.purchase_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(item.purchase_date).toLocaleDateString()}
                            </span>
                          )}
                          {item.purchase_location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.purchase_location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {item.purchase_price && (
                          <p className="text-lg font-bold" style={{color: 'var(--text-primary)'}}>
                            {formatCurrency(item.purchase_price)}
                          </p>
                        )}
                        <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                          {item.condition}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedGear(item)
                          setShowEditModal(true)
                        }}
                        className="px-3 py-2.5 rounded-md shadow-sm border transition-all hover:shadow-md group"
                        style={{
                          backgroundColor: 'var(--background-secondary)',
                          borderColor: 'var(--border-default)',
                          color: 'var(--text-secondary)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent-primary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-default)'
                        }}
                        title="Edit gear"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              ))}
            </div>
          )
        })()}
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

      {/* Gear Details Modal */}
      {showDetailsModal && selectedGear && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowDetailsModal(false)
            setSelectedGear(null)
          }}
        >
          <div 
            className="rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border" 
            style={{backgroundColor: 'var(--background-primary)', borderColor: 'var(--border-default)'}}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b" style={{borderColor: 'var(--border-default)'}}>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>
                  {selectedGear.components?.brand || selectedGear.custom_brand} {selectedGear.components?.name || selectedGear.custom_name}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      setShowEditModal(true)
                      // selectedGear is already set
                    }}
                    className="px-3 py-2.5 rounded-md shadow-sm border transition-all hover:shadow-md flex items-center gap-2 group"
                    style={{
                      backgroundColor: 'var(--background-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-secondary)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-default)'
                    }}
                    title="Edit this gear"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      setSelectedGear(null)
                    }}
                    className="text-secondary hover:text-primary transition-colors p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Component Details */}
              {selectedGear.components && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3" style={{color: 'var(--text-primary)'}}>Specifications</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span style={{color: 'var(--text-secondary)'}}>Category: </span>
                      <span className="capitalize" style={{color: 'var(--text-primary)'}}>{selectedGear.components.category}</span>
                    </div>
                    {selectedGear.components.impedance && (
                      <div>
                        <span style={{color: 'var(--text-secondary)'}}>Impedance: </span>
                        <span style={{color: 'var(--text-primary)'}}>{selectedGear.components.impedance}Ω</span>
                      </div>
                    )}
                    {selectedGear.components.budget_tier && (
                      <div>
                        <span style={{color: 'var(--text-secondary)'}}>Budget Tier: </span>
                        <span className="capitalize" style={{color: 'var(--text-primary)'}}>{selectedGear.components.budget_tier}</span>
                      </div>
                    )}
                    {selectedGear.components.sound_signature && (
                      <div>
                        <span style={{color: 'var(--text-secondary)'}}>Sound: </span>
                        <span className="capitalize" style={{color: 'var(--text-primary)'}}>{selectedGear.components.sound_signature}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Purchase Details */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3" style={{color: 'var(--text-primary)'}}>Purchase Information</h3>
                <div className="space-y-2 text-sm">
                  {selectedGear.purchase_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                      <span style={{color: 'var(--text-primary)'}}>
                        Purchased on {new Date(selectedGear.purchase_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedGear.purchase_price && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                      <span style={{color: 'var(--text-primary)'}}>
                        Paid {formatCurrency(selectedGear.purchase_price)}
                      </span>
                    </div>
                  )}
                  {selectedGear.purchase_location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" style={{color: 'var(--text-secondary)'}} />
                      <span style={{color: 'var(--text-primary)'}}>{selectedGear.purchase_location}</span>
                    </div>
                  )}
                  {selectedGear.notes && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 mt-0.5" style={{color: 'var(--text-secondary)'}} />
                      <span style={{color: 'var(--text-primary)'}}>{selectedGear.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    handleRemoveGear(selectedGear.id)
                    setShowDetailsModal(false)
                    setSelectedGear(null)
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Remove from Collection
                </button>
                <Link
                  href={`/used-market?search=${selectedGear.components?.brand} ${selectedGear.components?.name}`}
                  className="button button-primary flex-1 text-center"
                >
                  Find on Used Market
                </Link>
              </div>
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
            className="rounded-lg shadow-xl max-w-md w-full p-6"
            style={{backgroundColor: 'var(--background-primary)'}}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>
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
                  placeholder="Brief description of this setup..."
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

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateStackModal(false)
                  setNewStackName('')
                  setNewStackDescription('')
                }}
                className="flex-1 px-4 py-2 rounded-md border font-medium transition-colors"
                style={{
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--background-secondary)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newStackName.trim()) {
                    alert('Please enter a stack name')
                    return
                  }
                  
                  if (!session?.user?.id) return
                  
                  const stack = await createStack(
                    session.user.id,
                    newStackName.trim(),
                    newStackDescription.trim() || undefined
                  )
                  
                  if (stack) {
                    setShowCreateStackModal(false)
                    setNewStackName('')
                    setNewStackDescription('')
                    loadData()
                  }
                }}
                disabled={!newStackName.trim()}
                className="flex-1 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white'
                }}
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
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEditModal(false)
              setSelectedGear(null)
            }
          }}
        >
          <div 
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg p-6 shadow-2xl border"
            style={{
              backgroundColor: 'var(--background-primary)',
              borderColor: 'var(--border-default)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>
                Edit Gear Item
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedGear(null)
                }}
                className="p-1 rounded text-secondary hover:text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Name and Brand (for custom items) */}
              {!selectedGear.component_id && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-primary)'}}>
                      Brand
                    </label>
                    <BrandCombobox
                      value={editFormData.custom_brand}
                      onChange={(value) => setEditFormData(prev => ({...prev, custom_brand: value}))}
                      availableBrands={availableBrands}
                      placeholder="Search existing brands or enter new..."
                      className="w-full px-3 py-2 rounded-md border text-sm"
                      style={{
                        backgroundColor: 'var(--background-secondary)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-primary)'}}>
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={editFormData.custom_name}
                      onChange={(e) => setEditFormData(prev => ({...prev, custom_name: e.target.value}))}
                      className="w-full px-3 py-2 rounded-md border text-sm"
                      style={{
                        backgroundColor: 'var(--background-secondary)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                      placeholder="Enter product name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-primary)'}}>
                      Category
                    </label>
                    <select
                      value={editFormData.custom_category}
                      onChange={(e) => setEditFormData(prev => ({...prev, custom_category: e.target.value}))}
                      className="w-full px-3 py-2 rounded-md border text-sm"
                      style={{
                        backgroundColor: 'var(--background-secondary)',
                        borderColor: 'var(--border-default)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      <option value="">Select category</option>
                      <option value="headphones">Headphones</option>
                      <option value="iems">IEMs</option>
                      <option value="dacs">DACs</option>
                      <option value="amps">Amplifiers</option>
                      <option value="combo">Combos</option>
                    </select>
                  </div>
                </>
              )}

              {/* Purchase Details */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-primary)'}}>
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={editFormData.purchase_date}
                  onChange={(e) => setEditFormData(prev => ({...prev, purchase_date: e.target.value}))}
                  className="w-full px-3 py-2 rounded-md border text-sm"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-primary)'}}>
                  Purchase Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.purchase_price}
                  onChange={(e) => setEditFormData(prev => ({...prev, purchase_price: e.target.value}))}
                  className="w-full px-3 py-2 rounded-md border text-sm"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-primary)'}}>
                  Purchase Location
                </label>
                <input
                  type="text"
                  value={editFormData.purchase_location}
                  onChange={(e) => setEditFormData(prev => ({...prev, purchase_location: e.target.value}))}
                  className="w-full px-3 py-2 rounded-md border text-sm"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Amazon, Head-Fi, local store..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-primary)'}}>
                  Condition
                </label>
                <select
                  value={editFormData.condition}
                  onChange={(e) => setEditFormData(prev => ({...prev, condition: e.target.value as 'new' | 'used' | 'refurbished' | 'b-stock'}))}
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
                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-primary)'}}>
                  Serial Number
                </label>
                <input
                  type="text"
                  value={editFormData.serial_number}
                  onChange={(e) => setEditFormData(prev => ({...prev, serial_number: e.target.value}))}
                  className="w-full px-3 py-2 rounded-md border text-sm"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-primary)'}}>
                  Notes
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData(prev => ({...prev, notes: e.target.value}))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border text-sm resize-none"
                  style={{
                    backgroundColor: 'var(--background-secondary)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="Any additional notes about this item..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedGear(null)
                }}
                className="flex-1 px-4 py-2 rounded-md border font-medium transition-colors"
                style={{
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--background-secondary)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!session?.user?.id || !selectedGear) return
                  
                  const updates: Partial<UserGearItem> = {}
                  
                  if (editFormData.purchase_date) updates.purchase_date = editFormData.purchase_date
                  if (editFormData.purchase_price) updates.purchase_price = parseFloat(editFormData.purchase_price)
                  if (editFormData.purchase_location) updates.purchase_location = editFormData.purchase_location
                  if (editFormData.condition) updates.condition = editFormData.condition
                  if (editFormData.serial_number) updates.serial_number = editFormData.serial_number
                  if (editFormData.notes) updates.notes = editFormData.notes
                  
                  // For custom items, also update name, brand, category
                  if (!selectedGear.component_id) {
                    if (editFormData.custom_name) updates.custom_name = editFormData.custom_name
                    if (editFormData.custom_brand) updates.custom_brand = editFormData.custom_brand
                    if (editFormData.custom_category) updates.custom_category = editFormData.custom_category
                  }
                  
                  const success = await updateGearItem(session.user.id, selectedGear.id, updates)
                  
                  if (success) {
                    setShowEditModal(false)
                    setSelectedGear(null)
                    loadData() // Refresh the gear list
                  } else {
                    alert('Failed to update gear item. Please try again.')
                  }
                }}
                className="flex-1 px-4 py-2 rounded-md font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white'
                }}
              >
                Update Gear
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
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    }>
      <GearContent />
    </Suspense>
  )
}