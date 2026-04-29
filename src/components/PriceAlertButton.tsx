'use client'

import { useSession, signIn } from 'next-auth/react'
import { Bell, BellRing, Check } from 'lucide-react'
import { useState } from 'react'
import { createAlert } from '@/lib/alerts'

interface PriceAlertButtonProps {
  componentId: string
  /** Used to seed the default target price. Falls back to 0 if unknown. */
  avgPrice: number
  /** Preferred floor for the default target (e.g. lowest used-market price). */
  priceFloor?: number | null
  className?: string
  showText?: boolean
}

/**
 * One-click create-a-price-alert button, targeted at rec-card surfaces.
 * Defaults the threshold to `priceFloor` (typical used min) if provided,
 * otherwise 85 % of avgPrice — a realistic "wait for a dip" target. Users
 * can refine the price in the dashboard Alerts tab.
 *
 * Auth-gated: unauthenticated users are routed to sign-in and returned to
 * the same recommendations page afterward.
 */
export function PriceAlertButton({
  componentId,
  avgPrice,
  priceFloor,
  className = '',
  showText = false,
}: PriceAlertButtonProps) {
  const { data: session } = useSession()
  const [state, setState] = useState<'idle' | 'loading' | 'created' | 'error'>('idle')

  // Smart default: prefer observed used-min, else 85 % of avg.
  const defaultTarget = Math.max(
    20,
    Math.round(priceFloor && priceFloor > 0 ? priceFloor : avgPrice * 0.85)
  )

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!session?.user?.id) {
      // Route to sign-in, come back here
      signIn(undefined, {
        callbackUrl: typeof window !== 'undefined' ? window.location.href : '/recommendations',
      })
      return
    }

    if (state === 'loading' || state === 'created') return

    setState('loading')
    const result = await createAlert(session.user.id, {
      component_id: componentId,
      target_price: defaultTarget,
      alert_type: 'below',
      email_enabled: true,
      notification_frequency: 'instant',
      condition_preference: ['new', 'used', 'refurbished', 'b-stock'],
      marketplace_preference: ['reddit', 'headfi', 'avexchange'],
    })
    setState(result ? 'created' : 'error')
  }

  const authedIdleClasses = 'border-subtle hover:border-accent hover:text-accent'
  const createdClasses = 'border-accent bg-accent/5 text-accent'
  const errorClasses = 'border-red-400 text-red-600 dark:text-red-400'
  const statusClasses =
    state === 'created' ? createdClasses : state === 'error' ? errorClasses : authedIdleClasses

  const label =
    state === 'created'
      ? `Alert set at $${defaultTarget}`
      : state === 'error'
      ? 'Couldn\u2019t set alert'
      : state === 'loading'
      ? 'Setting alert\u2026'
      : session?.user?.id
      ? `Alert me under $${defaultTarget}`
      : 'Sign in to get a price alert'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'loading' || state === 'created'}
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${statusClasses} ${state === 'loading' ? 'opacity-60 cursor-wait' : ''} ${className}`}
    >
      {state === 'created' ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : state === 'loading' ? (
        <BellRing className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
      ) : (
        <Bell className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {showText && <span>{label}</span>}
    </button>
  )
}
