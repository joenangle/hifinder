'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { getUserAlerts, createAlert, updateAlert, deleteAlert, getAlertHistory, markAlertViewed, checkAlerts, PriceAlert, AlertHistory } from '@/lib/alerts'
import { supabase } from '@/lib/supabase'
import { Component } from '@/types'
import {
  Plus,
  Bell,
  BellOff,
  Search,
  X,
  DollarSign,
  Package,
  AlertCircle,
  Clock,
  ExternalLink,
  Trash2,
  CheckCircle,
  Filter,
  History
} from 'lucide-react'

export function AlertsTab() {
  const { data: session } = useSession()
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')
  const [selectedAlert, setSelectedAlert] = useState<PriceAlert | null>(null)
  const [selectedAlertHistory, setSelectedAlertHistory] = useState<AlertHistory[]>([])
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  
  // Create alert form state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Component[]>([])
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)
  const [isCustomAlert, setIsCustomAlert] = useState(false)
  const [alertForm, setAlertForm] = useState({
    target_price: '',
    alert_type: 'below' as 'below' | 'exact' | 'range',
    price_range_min: '',
    price_range_max: '',
    condition_preference: ['new', 'used', 'refurbished', 'b-stock'],
    marketplace_preference: ['reddit', 'headfi', 'avexchange'],
    custom_search_query: '',
    custom_brand: '',
    custom_model: ''
  })

  const loadAlerts = useCallback(async () => {
    if (!session?.user?.id) return
    
    setLoading(true)
    const userAlerts = await getUserAlerts(session.user.id)
    setAlerts(userAlerts)
    setLoading(false)
  }, [session?.user?.id])

  const loadHistory = useCallback(async () => {
    if (!session?.user?.id) return
    
    const history = await getAlertHistory(session.user.id)
    setAlertHistory(history)
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) {
      loadAlerts()
      loadHistory()
      checkAlerts(session.user.id)
    }
  }, [session?.user?.id, loadAlerts, loadHistory])

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

  const handleCreateAlert = async () => {
    if (!session?.user?.id) return
    
    const alertData: Partial<PriceAlert> = {
      component_id: selectedComponent?.id,
      target_price: parseFloat(alertForm.target_price),
      alert_type: alertForm.alert_type,
      condition_preference: alertForm.condition_preference,
      marketplace_preference: alertForm.marketplace_preference
    }

    if (alertForm.alert_type === 'range') {
      alertData.price_range_min = parseFloat(alertForm.price_range_min)
      alertData.price_range_max = parseFloat(alertForm.price_range_max)
    }

    if (isCustomAlert) {
      if (alertForm.custom_search_query) {
        alertData.custom_search_query = alertForm.custom_search_query
      } else {
        alertData.custom_brand = alertForm.custom_brand
        alertData.custom_model = alertForm.custom_model
      }
    }

    const newAlert = await createAlert(session.user.id, alertData)
    if (newAlert) {
      await loadAlerts()
      setShowCreateModal(false)
      resetForm()
    }
  }

  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    if (!session?.user?.id) return
    
    const success = await updateAlert(session.user.id, alertId, { is_active: !isActive })
    if (success) {
      await loadAlerts()
    }
  }

  const handleDeleteAlert = async (alertId: string) => {
    if (!session?.user?.id) return
    
    const success = await deleteAlert(session.user.id, alertId)
    if (success) {
      await loadAlerts()
    }
  }

  const handleShowAlertHistory = async (alert: PriceAlert) => {
    if (!session?.user?.id) return
    setSelectedAlert(alert)
    setShowHistoryModal(true)
    setHistoryLoading(true)
    const history = await getAlertHistory(session.user.id, alert.id)
    setSelectedAlertHistory(history)
    setHistoryLoading(false)
  }

  const handleMarkViewed = async (historyId: string) => {
    if (!session?.user?.id) return
    
    const success = await markAlertViewed(session.user.id, historyId)
    if (success) {
      await loadHistory()
    }
  }

  const resetForm = () => {
    setSearchQuery('')
    setSearchResults([])
    setSelectedComponent(null)
    setIsCustomAlert(false)
    setAlertForm({
      target_price: '',
      alert_type: 'below',
      price_range_min: '',
      price_range_max: '',
      condition_preference: ['new', 'used', 'refurbished', 'b-stock'],
      marketplace_preference: ['reddit', 'headfi', 'avexchange'],
      custom_search_query: '',
      custom_brand: '',
      custom_model: ''
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const activeAlerts = alerts.filter(a => a.is_active)
  const inactiveAlerts = alerts.filter(a => !a.is_active)
  const unviewedHistory = alertHistory.filter(h => !h.user_viewed)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <>
      <div>
        {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            {unviewedHistory.length > 0 && (
              <span className="px-2 py-1 bg-accent text-accent-foreground text-xs font-bold rounded-full">
                {unviewedHistory.length} NEW
              </span>
            )}
          </div>
          <p className="text-muted">
            {activeAlerts.length} active {activeAlerts.length === 1 ? 'alert' : 'alerts'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="button button-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Alert
        </button>
      </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'active' 
                ? 'bg-accent text-accent-foreground' 
                : 'bg-surface-secondary text-muted hover:text-foreground'
            }`}
          >
            Active Alerts ({activeAlerts.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
              activeTab === 'history' 
                ? 'bg-accent text-accent-foreground' 
                : 'bg-surface-secondary text-muted hover:text-foreground'
            }`}
          >
            Alert History
            {unviewedHistory.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unviewedHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {activeTab === 'active' ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted mb-1">Active Alerts</p>
                    <p className="text-2xl font-bold text-foreground">{activeAlerts.length}</p>
                  </div>
                  <Bell className="w-8 h-8 text-accent" />
                </div>
              </div>
              
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted mb-1">Total Triggers</p>
                    <p className="text-2xl font-bold text-foreground">
                      {alerts.reduce((sum, a) => sum + a.trigger_count, 0)}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted mb-1">Unread Matches</p>
                    <p className="text-2xl font-bold text-foreground">{unviewedHistory.length}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-yellow-500" />
                </div>
              </div>
              
              <div className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted mb-1">Paused Alerts</p>
                    <p className="text-2xl font-bold text-foreground">{inactiveAlerts.length}</p>
                  </div>
                  <BellOff className="w-8 h-8 text-gray-500" />
                </div>
              </div>
            </div>

            {/* Alerts List */}
            {alerts.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-muted mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">No price alerts yet</h2>
                <p className="text-muted mb-6">Create your first alert to get notified of price drops</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="button button-primary"
                >
                  Create Your First Alert
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map(alert => (
                  <div key={alert.id} className="card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-foreground">
                            {alert.components ? (
                              `${alert.components.brand} ${alert.components.name}`
                            ) : alert.custom_search_query ? (
                              alert.custom_search_query
                            ) : (
                              `${alert.custom_brand} ${alert.custom_model}`
                            )}
                          </h3>
                          {!alert.is_active && (
                            <span className="px-2 py-1 bg-surface-secondary text-secondary text-xs rounded">
                              Paused
                            </span>
                          )}
                          {alert.trigger_count > 0 && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded">
                              {alert.trigger_count} matches
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {alert.alert_type === 'below' && `Under ${formatCurrency(alert.target_price)}`}
                            {alert.alert_type === 'exact' && `Around ${formatCurrency(alert.target_price)}`}
                            {alert.alert_type === 'range' && `${formatCurrency(alert.price_range_min || 0)} - ${formatCurrency(alert.price_range_max || 0)}`}
                          </span>
                          
                          <span className="flex items-center gap-1">
                            <Filter className="w-3 h-3" />
                            {alert.condition_preference.join(', ')}
                          </span>
                          
                          {alert.last_triggered_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Last triggered {new Date(alert.last_triggered_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                          className={`p-2 rounded transition-colors ${
                            alert.is_active 
                              ? 'text-accent hover:bg-surface-secondary' 
                              : 'text-muted hover:bg-surface-secondary'
                          }`}
                        >
                          {alert.is_active ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                        </button>
                        
                        <button
                          onClick={() => handleShowAlertHistory(alert)}
                          className="p-2 text-muted hover:text-foreground hover:bg-surface-secondary rounded transition-colors"
                          title="View match history"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Alert History */}
            {alertHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-muted mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">No matches yet</h2>
                <p className="text-muted">When your alerts trigger, you&apos;ll see them here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {alertHistory.map(item => (
                  <div 
                    key={item.id} 
                    className={`card p-4 ${!item.user_viewed ? 'ring-2 ring-accent' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1">
                          {item.listing_title}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-sm text-muted mb-2">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatCurrency(item.listing_price)}
                          </span>
                          
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {item.listing_condition}
                          </span>
                          
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(item.triggered_at).toLocaleDateString()}
                          </span>
                          
                          <span className="text-xs px-2 py-1 bg-surface-secondary rounded">
                            {item.listing_source}
                          </span>
                        </div>
                        
                        {!item.user_viewed && (
                          <button
                            onClick={() => handleMarkViewed(item.id)}
                            className="text-xs text-accent hover:underline"
                          >
                            Mark as viewed
                          </button>
                        )}
                      </div>
                      
                      <a
                        href={item.listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button-secondary flex items-center gap-2"
                        aria-label="View listing (opens in new tab)"
                      >
                        View Listing
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Alert Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">Create Price Alert</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="text-muted hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Toggle between search and custom */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setIsCustomAlert(false)}
                  className={`flex-1 py-2 px-4 rounded ${
                    !isCustomAlert ? 'bg-accent text-accent-foreground' : 'bg-surface-secondary text-muted'
                  }`}
                >
                  Search Database
                </button>
                <button
                  onClick={() => setIsCustomAlert(true)}
                  className={`flex-1 py-2 px-4 rounded ${
                    isCustomAlert ? 'bg-accent text-accent-foreground' : 'bg-surface-secondary text-muted'
                  }`}
                >
                  Custom Search
                </button>
              </div>

              {!isCustomAlert ? (
                <>
                  {/* Component Search */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Search for Component
                    </label>
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          searchComponents(e.target.value)
                        }}
                        placeholder="Search by brand or model..."
                        className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-md text-foreground"
                      />
                    </div>

                    {searchResults.length > 0 && (
                      <div className="mt-2 border border-border rounded-md bg-surface max-h-48 overflow-y-auto">
                        {searchResults.map(component => (
                          <button
                            key={component.id}
                            onClick={() => {
                              setSelectedComponent(component)
                              setSearchResults([])
                              setSearchQuery(`${component.brand} ${component.name}`)
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-surface-secondary transition-colors flex justify-between"
                          >
                            <span className="text-foreground">{component.brand} {component.name}</span>
                            <span className="text-muted text-sm">{component.category}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Custom Search Fields */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Search Query (use this OR brand/model below)
                    </label>
                    <input
                      type="text"
                      value={alertForm.custom_search_query}
                      onChange={(e) => setAlertForm({...alertForm, custom_search_query: e.target.value})}
                      placeholder="e.g., HD650, Schiit Magni"
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md text-foreground"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Brand
                      </label>
                      <input
                        type="text"
                        value={alertForm.custom_brand}
                        onChange={(e) => setAlertForm({...alertForm, custom_brand: e.target.value})}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Model
                      </label>
                      <input
                        type="text"
                        value={alertForm.custom_model}
                        onChange={(e) => setAlertForm({...alertForm, custom_model: e.target.value})}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-md text-foreground"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Alert Configuration */}
              <h3 className="font-semibold text-foreground mb-4">Alert Settings</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Alert Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setAlertForm({...alertForm, alert_type: 'below'})}
                    className={`py-2 px-4 rounded text-sm ${
                      alertForm.alert_type === 'below' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'bg-surface-secondary text-muted'
                    }`}
                  >
                    Below Price
                  </button>
                  <button
                    onClick={() => setAlertForm({...alertForm, alert_type: 'exact'})}
                    className={`py-2 px-4 rounded text-sm ${
                      alertForm.alert_type === 'exact' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'bg-surface-secondary text-muted'
                    }`}
                  >
                    Around Price
                  </button>
                  <button
                    onClick={() => setAlertForm({...alertForm, alert_type: 'range'})}
                    className={`py-2 px-4 rounded text-sm ${
                      alertForm.alert_type === 'range' 
                        ? 'bg-accent text-accent-foreground' 
                        : 'bg-surface-secondary text-muted'
                    }`}
                  >
                    Price Range
                  </button>
                </div>
              </div>

              {alertForm.alert_type !== 'range' ? (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Target Price
                  </label>
                  <input
                    type="number"
                    value={alertForm.target_price}
                    onChange={(e) => setAlertForm({...alertForm, target_price: e.target.value})}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-surface border border-border rounded-md text-foreground"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Min Price
                    </label>
                    <input
                      type="number"
                      value={alertForm.price_range_min}
                      onChange={(e) => setAlertForm({...alertForm, price_range_min: e.target.value})}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Max Price
                    </label>
                    <input
                      type="number"
                      value={alertForm.price_range_max}
                      onChange={(e) => setAlertForm({...alertForm, price_range_max: e.target.value})}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md text-foreground"
                    />
                  </div>
                </div>
              )}

              {/* Condition Preferences */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Condition Preferences
                </label>
                <div className="flex flex-wrap gap-2">
                  {['new', 'used', 'refurbished', 'b-stock'].map(condition => (
                    <button
                      key={condition}
                      onClick={() => {
                        const prefs = alertForm.condition_preference
                        if (prefs.includes(condition)) {
                          setAlertForm({
                            ...alertForm,
                            condition_preference: prefs.filter(c => c !== condition)
                          })
                        } else {
                          setAlertForm({
                            ...alertForm,
                            condition_preference: [...prefs, condition]
                          })
                        }
                      }}
                      className={`px-3 py-1 rounded text-sm capitalize ${
                        alertForm.condition_preference.includes(condition)
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-surface-secondary text-muted'
                      }`}
                    >
                      {condition}
                    </button>
                  ))}
                </div>
              </div>

              {/* Marketplace Preferences */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Marketplace Preferences
                </label>
                <div className="flex flex-wrap gap-2">
                  {['reddit', 'headfi', 'avexchange'].map(marketplace => (
                    <button
                      key={marketplace}
                      onClick={() => {
                        const prefs = alertForm.marketplace_preference
                        if (prefs.includes(marketplace)) {
                          setAlertForm({
                            ...alertForm,
                            marketplace_preference: prefs.filter(m => m !== marketplace)
                          })
                        } else {
                          setAlertForm({
                            ...alertForm,
                            marketplace_preference: [...prefs, marketplace]
                          })
                        }
                      }}
                      className={`px-3 py-1 rounded text-sm capitalize ${
                        alertForm.marketplace_preference.includes(marketplace)
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-surface-secondary text-muted'
                      }`}
                    >
                      {marketplace}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="button button-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAlert}
                  disabled={
                    (!isCustomAlert && !selectedComponent) ||
                    (alertForm.alert_type !== 'range' && !alertForm.target_price) ||
                    (alertForm.alert_type === 'range' && (!alertForm.price_range_min || !alertForm.price_range_max))
                  }
                  className="button button-primary flex-1 disabled:opacity-50"
                >
                  Create Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert History Modal */}
      {showHistoryModal && selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Match History</h2>
                  <p className="text-sm text-muted mt-1">
                    {selectedAlert.components
                      ? `${selectedAlert.components.brand} ${selectedAlert.components.name}`
                      : selectedAlert.custom_search_query || `${selectedAlert.custom_brand} ${selectedAlert.custom_model}`
                    }
                    {' '}&middot; {selectedAlert.trigger_count} total matches
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowHistoryModal(false)
                    setSelectedAlert(null)
                    setSelectedAlertHistory([])
                  }}
                  className="text-muted hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                </div>
              ) : selectedAlertHistory.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-muted mx-auto mb-3" />
                  <p className="text-muted">No matches found for this alert yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedAlertHistory.map(item => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border ${!item.user_viewed ? 'border-accent bg-accent/5' : 'border-border'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm truncate">
                            {item.listing_title}
                          </h4>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                            <span className="font-semibold text-foreground">
                              {formatCurrency(item.listing_price)}
                            </span>
                            <span>{item.listing_condition}</span>
                            <span>{item.listing_source}</span>
                            <span>{new Date(item.triggered_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!item.user_viewed && (
                            <button
                              onClick={() => handleMarkViewed(item.id)}
                              className="text-xs text-accent hover:underline"
                            >
                              Mark read
                            </button>
                          )}
                          <a
                            href={item.listing_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-muted hover:text-accent transition-colors"
                            aria-label="View listing (opens in new tab)"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}