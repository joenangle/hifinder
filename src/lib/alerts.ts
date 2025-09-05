import { supabase } from './supabase'
import { TriggeredAlert } from '@/types/auth'

export interface PriceAlert {
  id: string
  user_id: string
  component_id?: string
  target_price: number
  alert_type: 'below' | 'exact' | 'range'
  price_range_min?: number
  price_range_max?: number
  condition_preference: string[]
  marketplace_preference: string[]
  custom_search_query?: string
  custom_brand?: string
  custom_model?: string
  is_active: boolean
  last_triggered_at?: string
  trigger_count: number
  created_at: string
  updated_at: string
  components?: {
    id: string
    name: string
    brand: string
    category: string
    type?: string
    image_url?: string
    price_new?: number
    price_used_min?: number
    price_used_max?: number
  }
}

export interface AlertHistory {
  id: string
  alert_id: string
  user_id: string
  listing_title: string
  listing_price: number
  listing_condition: string
  listing_url: string
  listing_source: string
  listing_date: string
  triggered_at: string
  notification_sent: boolean
  user_viewed: boolean
}

export async function getUserAlerts(userId: string): Promise<PriceAlert[]> {
  const { data, error } = await supabase
    .from('price_alerts')
    .select(`
      *,
      components (
        id,
        name,
        brand,
        category,
        type,
        image_url,
        price_new,
        price_used_min,
        price_used_max
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching price alerts:', error)
    return []
  }

  return data as PriceAlert[]
}

export async function createAlert(
  userId: string,
  alertData: Partial<PriceAlert>
): Promise<PriceAlert | null> {
  const { data, error } = await supabase
    .from('price_alerts')
    .insert({
      ...alertData,
      user_id: userId,
      is_active: true,
      trigger_count: 0
    })
    .select(`
      *,
      components (
        id,
        name,
        brand,
        category,
        type,
        image_url,
        price_new,
        price_used_min,
        price_used_max
      )
    `)
    .single()

  if (error) {
    console.error('Error creating alert:', error)
    return null
  }

  return data as PriceAlert
}

export async function updateAlert(
  userId: string,
  alertId: string,
  updates: Partial<PriceAlert>
): Promise<boolean> {
  const { error } = await supabase
    .from('price_alerts')
    .update(updates)
    .eq('id', alertId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error updating alert:', error)
    return false
  }

  return true
}

export async function deleteAlert(
  userId: string,
  alertId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('price_alerts')
    .delete()
    .eq('id', alertId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting alert:', error)
    return false
  }

  return true
}

export async function getAlertHistory(
  userId: string,
  alertId?: string
): Promise<AlertHistory[]> {
  let query = supabase
    .from('alert_history')
    .select('*')
    .eq('user_id', userId)
    .order('triggered_at', { ascending: false })

  if (alertId) {
    query = query.eq('alert_id', alertId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching alert history:', error)
    return []
  }

  return data as AlertHistory[]
}

export async function markAlertViewed(
  userId: string,
  historyId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('alert_history')
    .update({ 
      user_viewed: true, 
      user_viewed_at: new Date().toISOString() 
    })
    .eq('id', historyId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error marking alert as viewed:', error)
    return false
  }

  return true
}

export async function checkAlerts(userId: string) {
  // Get active alerts
  const alerts = await getUserAlerts(userId)
  const activeAlerts = alerts.filter(a => a.is_active)

  if (activeAlerts.length === 0) return

  // Fetch current used listings
  const { data: listings, error } = await supabase
    .from('used_listings')
    .select('*')
    .eq('is_active', true)
    .order('date_posted', { ascending: false })

  if (error || !listings) return

  const triggeredAlerts: TriggeredAlert[] = []

  for (const alert of activeAlerts) {
    // Build search pattern
    const searchTerms = []
    
    if (alert.component_id && alert.components) {
      searchTerms.push(alert.components.brand.toLowerCase())
      searchTerms.push(alert.components.name.toLowerCase())
    } else if (alert.custom_search_query) {
      searchTerms.push(alert.custom_search_query.toLowerCase())
    } else if (alert.custom_brand && alert.custom_model) {
      searchTerms.push(alert.custom_brand.toLowerCase())
      searchTerms.push(alert.custom_model.toLowerCase())
    }

    if (searchTerms.length === 0) continue

    // Check each listing
    for (const listing of listings) {
      const titleLower = listing.title.toLowerCase()
      const matchesSearch = searchTerms.every(term => titleLower.includes(term))
      
      if (!matchesSearch) continue

      // Check price criteria
      let priceMatch = false
      const listingPrice = listing.price

      switch (alert.alert_type) {
        case 'below':
          priceMatch = listingPrice <= alert.target_price
          break
        case 'exact':
          priceMatch = Math.abs(listingPrice - alert.target_price) <= 10 // Within $10
          break
        case 'range':
          if (alert.price_range_min && alert.price_range_max) {
            priceMatch = listingPrice >= alert.price_range_min && listingPrice <= alert.price_range_max
          }
          break
      }

      if (!priceMatch) continue

      // Check condition preference
      if (alert.condition_preference.length > 0 && listing.condition) {
        const conditionMatch = alert.condition_preference.some(cond => 
          listing.condition.toLowerCase().includes(cond.toLowerCase())
        )
        if (!conditionMatch) continue
      }

      // Check marketplace preference
      if (alert.marketplace_preference.length > 0 && listing.source) {
        const marketplaceMatch = alert.marketplace_preference.includes(listing.source)
        if (!marketplaceMatch) continue
      }

      // We have a match! Record it
      triggeredAlerts.push({
        alert: alert,
        listing: {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          condition: listing.condition,
          url: listing.url
        },
        matchType: alert.component_id ? 'component' : alert.brand ? 'brand' : 'category',
        triggered_at: new Date().toISOString()
      })
    }
  }

  // Insert triggered alerts into history
  if (triggeredAlerts.length > 0) {
    const historyRecords = triggeredAlerts.map(ta => ({
      alert_id: ta.alert.id,
      user_id: userId,
      listing_title: ta.listing.title,
      listing_price: ta.listing.price,
      listing_condition: ta.listing.condition,
      listing_url: ta.listing.url,
      match_type: ta.matchType,
      triggered_at: ta.triggered_at
    }))

    const { error: insertError } = await supabase
      .from('alert_history')
      .insert(historyRecords)

    if (!insertError) {
      // Update alert trigger counts
      const alertIds = [...new Set(triggeredAlerts.map(t => t.alert.id))]
      for (const alertId of alertIds) {
        await supabase
          .from('price_alerts')
          .update({ 
            last_triggered_at: new Date().toISOString(),
            trigger_count: supabase.sql`trigger_count + 1`
          })
          .eq('id', alertId)
      }
    }
  }

  return triggeredAlerts.length
}