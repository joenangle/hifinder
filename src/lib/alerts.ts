import { supabase } from './supabase'
import type { PriceAlert, AlertHistory } from '@/types/marketplace'

export type { PriceAlert, AlertHistory } from '@/types/marketplace'

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

