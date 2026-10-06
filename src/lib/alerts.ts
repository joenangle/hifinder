import type { PriceAlert, AlertHistory } from '@/types/marketplace'

export type { PriceAlert, AlertHistory } from '@/types/marketplace'

// Browser client for /api/alerts. price_alerts and alert_history are RLS-locked
// to auth.uid(), which NextAuth never sets, so all access goes through the
// session-scoped API routes rather than the Supabase anon client.

async function request<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      console.error(`${init?.method ?? 'GET'} ${url} failed:`, body.error ?? response.status)
      return null
    }
    return (await response.json()) as T
  } catch (error) {
    console.error(`${init?.method ?? 'GET'} ${url} failed:`, error)
    return null
  }
}

export async function getUserAlerts(): Promise<PriceAlert[]> {
  return (await request<PriceAlert[]>('/api/alerts')) ?? []
}

export async function createAlert(alertData: Partial<PriceAlert>): Promise<PriceAlert | null> {
  return request<PriceAlert>('/api/alerts', {
    method: 'POST',
    body: JSON.stringify(alertData),
  })
}

export async function updateAlert(alertId: string, updates: Partial<PriceAlert>): Promise<boolean> {
  const result = await request('/api/alerts', {
    method: 'PATCH',
    body: JSON.stringify({ ...updates, id: alertId }),
  })
  return result !== null
}

export async function deleteAlert(alertId: string): Promise<boolean> {
  const result = await request(`/api/alerts?id=${encodeURIComponent(alertId)}`, { method: 'DELETE' })
  return result !== null
}

export async function getAlertHistory(alertId?: string): Promise<AlertHistory[]> {
  const url = alertId
    ? `/api/alerts/history?alert_id=${encodeURIComponent(alertId)}`
    : '/api/alerts/history'
  return (await request<AlertHistory[]>(url)) ?? []
}

export async function markAlertViewed(historyId: string): Promise<boolean> {
  const result = await request('/api/alerts/history', {
    method: 'PATCH',
    body: JSON.stringify({ id: historyId }),
  })
  return result !== null
}
