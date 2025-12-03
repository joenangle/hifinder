'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { UserGearItem } from '@/lib/gear'
import { StackWithGear } from '@/lib/stacks'
import { Package, Plus, DollarSign, Calendar, MapPin, Layers, X, Search } from 'lucide-react'
import Link from 'next/link'
import { Component } from '@/types'

export function GearTab() {
  const { data: session } = useSession()
  const [gear, setGear] = useState<UserGearItem[]>([])
  const [stacks, setStacks] = useState<StackWithGear[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'headphones' | 'iems' | 'dacs' | 'amps' | 'combo'>('all')
  const [showAddModal, setShowAddModal] = useState(false)

  // Drag and drop state
  const [draggedGear, setDraggedGear] = useState<UserGearItem | null>(null)
  const [dragOverStack, setDragOverStack] = useState<string | null>(null)

  // Quick add form state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Component[]>([])
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)
  const [addFormData, setAddFormData] = useState({
    purchase_price: '',
    condition: 'used' as 'new' | 'used' | 'refurbished' | 'b-stock',
    notes: '',
  })

  const loadData = useCallback(async () => {
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const response = await fetch('/api/user/dashboard', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setGear(data.gear || [])
        setStacks(data.stacks || [])
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

  // Search components for quick add
  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const response = await fetch(`/api/components/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.slice(0, 5)) // Limit to 5 results
      }
    } catch (error) {
      console.error('Error searching components:', error)
    }
  }

  // Quick add gear to collection
  const handleQuickAdd = async () => {
    if (!selectedComponent) return

    try {
      const response = await fetch('/api/user/gear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          component_id: selectedComponent.id,
          purchase_price: addFormData.purchase_price || null,
          condition: addFormData.condition,
          notes: addFormData.notes || null,
        })
      })

      if (response.ok) {
        await loadData()
        setShowAddModal(false)
        resetAddForm()
      }
    } catch (error) {
      console.error('Error adding gear:', error)
    }
  }

  const resetAddForm = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedComponent(null)
    setAddFormData({
      purchase_price: '',
      condition: 'used',
      notes: '',
    })
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
        const response = await fetch('/api/stacks/components', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            stack_id: stackId,
            user_gear_id: draggedGear.id
          })
        })

        if (response.ok) {
          await loadData()
        }
      } catch (error) {
        console.error('Error adding gear to stack:', error)
      }
    }
    setDraggedGear(null)
    setDragOverStack(null)
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getCategoryFromItem = (item: UserGearItem): string => {
    if (item.custom_category) return item.custom_category
    if (item.components?.category) return item.components.category
    return 'other'
  }

  const filteredGear = gear.filter(item => {
    if (filter === 'all') return true
    const category = getCategoryFromItem(item)
    // Handle category mappings
    if (filter === 'headphones') return category === 'cans' || category === 'headphones'
    if (filter === 'iems') return category === 'iems'
    if (filter === 'dacs') return category === 'dac' || category === 'dacs'
    if (filter === 'amps') return category === 'amp' || category === 'amps'
    if (filter === 'combo') return category === 'dac_amp' || category === 'combo'
    return category === filter
  })

  const getDisplayName = (item: UserGearItem): string => {
    if (item.custom_name) return item.custom_name
    if (item.custom_brand) return `${item.custom_brand} (Custom)`
    if (item.components) return `${item.components.brand} ${item.components.name}`
    return 'Unknown Item'
  }

  // Get top 3 most recently updated stacks
  const topStacks = stacks
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (gear.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto mb-4 text-muted" />
        <h2 className="text-xl font-semibold text-foreground mb-2">No gear in your collection</h2>
        <p className="text-muted mb-6">
          Start tracking your audio gear collection
        </p>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Your First Item
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">My Gear Collection</h2>
          <p className="text-muted">{gear.length} {gear.length === 1 ? 'item' : 'items'} in your collection</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Quick Add
          </button>
          <Link
            href="/gear"
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface-secondary hover:bg-surface-hover text-foreground rounded-lg font-medium transition-colors"
          >
            Advanced Manager →
          </Link>
        </div>
      </div>

      {/* Stacks Preview Section */}
      {topStacks.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Recent Stacks
            </h3>
            <Link
              href="/gear?view=stacks"
              className="text-sm text-accent hover:underline"
            >
              View All Stacks →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {topStacks.map((stack) => (
              <div
                key={stack.id}
                onDragOver={(e) => handleDragOver(e, stack.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stack.id)}
                className={`bg-surface-elevated border-2 rounded-lg p-4 transition-all ${
                  dragOverStack === stack.id
                    ? 'border-accent ring-2 ring-accent/50 bg-accent/5'
                    : 'border-border hover:border-accent/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{stack.name}</h4>
                    {stack.description && (
                      <p className="text-xs text-muted mt-1 line-clamp-1">{stack.description}</p>
                    )}
                  </div>
                  {stack.purpose && (
                    <span className="text-xs px-2 py-1 bg-surface-secondary text-muted rounded capitalize">
                      {stack.purpose}
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted">
                  {stack.stack_components?.length || 0} {stack.stack_components?.length === 1 ? 'item' : 'items'}
                </div>
                {dragOverStack === stack.id && (
                  <div className="mt-2 text-xs text-accent font-medium">
                    Drop to add gear to stack
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-muted mb-6">
            💡 Tip: Drag gear cards to stacks to organize your collection
          </div>
        </div>
      )}

      {/* Category Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-secondary text-muted hover:text-foreground'
          }`}
        >
          All ({gear.length})
        </button>
        <button
          onClick={() => setFilter('headphones')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'headphones'
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-secondary text-muted hover:text-foreground'
          }`}
        >
          🎧 Headphones ({gear.filter(g => {
            const cat = getCategoryFromItem(g)
            return cat === 'cans' || cat === 'headphones'
          }).length})
        </button>
        <button
          onClick={() => setFilter('iems')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'iems'
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-secondary text-muted hover:text-foreground'
          }`}
        >
          👂 IEMs ({gear.filter(g => getCategoryFromItem(g) === 'iems').length})
        </button>
        <button
          onClick={() => setFilter('dacs')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'dacs'
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-secondary text-muted hover:text-foreground'
          }`}
        >
          🔄 DACs ({gear.filter(g => {
            const cat = getCategoryFromItem(g)
            return cat === 'dac' || cat === 'dacs'
          }).length})
        </button>
        <button
          onClick={() => setFilter('amps')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'amps'
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-secondary text-muted hover:text-foreground'
          }`}
        >
          ⚡ Amps ({gear.filter(g => {
            const cat = getCategoryFromItem(g)
            return cat === 'amp' || cat === 'amps'
          }).length})
        </button>
        <button
          onClick={() => setFilter('combo')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'combo'
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-secondary text-muted hover:text-foreground'
          }`}
        >
          🔗 Combos ({gear.filter(g => {
            const cat = getCategoryFromItem(g)
            return cat === 'dac_amp' || cat === 'combo'
          }).length})
        </button>
      </div>

      {/* Gear Grid */}
      {filteredGear.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto mb-3 text-muted" />
          <p className="text-muted">No {filter} in your collection</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGear.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragEnd={handleDragEnd}
              className={`bg-surface-elevated border border-border rounded-lg p-6 hover:border-accent transition-all cursor-move ${
                draggedGear?.id === item.id ? 'opacity-50 scale-95' : ''
              }`}
            >
              {/* Item Name */}
              <div className="mb-4">
                <h3 className="font-semibold text-foreground text-lg mb-1">
                  {getDisplayName(item)}
                </h3>
                <p className="text-sm text-muted capitalize">
                  {getCategoryFromItem(item)}
                </p>
              </div>

              {/* Purchase Info */}
              <div className="space-y-2 mb-4">
                {item.purchase_price && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted" />
                    <span className="text-foreground">
                      Paid {formatPrice(item.purchase_price)}
                    </span>
                  </div>
                )}

                {item.purchase_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted" />
                    <span className="text-muted">
                      {new Date(item.purchase_date).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {item.purchase_location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted" />
                    <span className="text-muted">{item.purchase_location}</span>
                  </div>
                )}

                {item.condition && (
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 bg-surface-secondary text-muted text-xs rounded capitalize">
                      {item.condition}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {item.notes && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted line-clamp-2">{item.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated border border-border rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface-elevated border-b border-border p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Quick Add Gear</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  resetAddForm()
                }}
                className="text-muted hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Search Component */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Search Component
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by brand or model..."
                    className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-border rounded-lg overflow-hidden">
                    {searchResults.map((component) => (
                      <button
                        key={component.id}
                        onClick={() => {
                          setSelectedComponent(component)
                          setSearchResults([])
                          setSearchQuery(`${component.brand} ${component.name}`)
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors border-b border-border last:border-b-0"
                      >
                        <div className="font-medium text-foreground">
                          {component.brand} {component.name}
                        </div>
                        <div className="text-sm text-muted capitalize">
                          {component.category}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedComponent && (
                <>
                  {/* Purchase Price */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Purchase Price (optional)
                    </label>
                    <input
                      type="number"
                      value={addFormData.purchase_price}
                      onChange={(e) => setAddFormData({ ...addFormData, purchase_price: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Condition
                    </label>
                    <select
                      value={addFormData.condition}
                      onChange={(e) => setAddFormData({ ...addFormData, condition: e.target.value as 'new' | 'used' | 'refurbished' | 'b-stock' })}
                      className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="new">New</option>
                      <option value="used">Used</option>
                      <option value="refurbished">Refurbished</option>
                      <option value="b-stock">B-Stock</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={addFormData.notes}
                      onChange={(e) => setAddFormData({ ...addFormData, notes: e.target.value })}
                      placeholder="Any additional notes..."
                      rows={3}
                      className="w-full px-4 py-2 bg-surface border border-border rounded-lg text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>

                  {/* Add Button */}
                  <button
                    onClick={handleQuickAdd}
                    className="w-full px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg font-medium transition-colors"
                  >
                    Add to Collection
                  </button>
                </>
              )}

              {!selectedComponent && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="text-center py-8 text-muted">
                  <p className="mb-4">No components found</p>
                  <Link
                    href="/gear"
                    className="text-accent hover:underline"
                  >
                    Use Advanced Manager for custom entries →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
