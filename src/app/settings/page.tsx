'use client'

import { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Bell, Check, Loader2 } from 'lucide-react'

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false
    fetch('/api/user/preferences', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (typeof data.emailAlertsEnabled === 'boolean') setEmailAlertsEnabled(data.emailAlertsEnabled)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [status])

  async function toggleEmailAlerts() {
    const next = !emailAlertsEnabled
    setEmailAlertsEnabled(next)
    setSaveState('saving')
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emailAlertsEnabled: next }),
      })
      if (!res.ok) throw new Error()
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 1500)
    } catch {
      // Revert on failure.
      setEmailAlertsEnabled(!next)
      setSaveState('idle')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground mb-3">Settings</h1>
          <p className="text-muted mb-5">Sign in to manage your notification preferences.</p>
          <button onClick={() => signIn(undefined, { callbackUrl: '/settings' })} className="button button-primary">
            Sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-foreground mb-1">Settings</h1>
        <p className="text-muted mb-8">{session?.user?.email}</p>

        <section className="bg-surface-elevated border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-accent" />
            <h2 className="font-semibold text-foreground">Email notifications</h2>
          </div>

          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="text-foreground font-medium">Price-alert emails</div>
              <p className="text-sm text-muted mt-0.5">
                When this is off, you won&apos;t receive any alert emails — even for alerts marked as
                email-enabled. Per-alert settings still control which alerts notify when this is on.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleEmailAlerts}
              disabled={loading || saveState === 'saving'}
              role="switch"
              aria-checked={emailAlertsEnabled}
              aria-label="Toggle price-alert emails"
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                emailAlertsEnabled ? 'bg-accent' : 'bg-surface-secondary'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  emailAlertsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {saveState === 'saved' && (
            <div className="mt-4 flex items-center gap-1.5 text-sm text-accent">
              <Check className="w-4 h-4" /> Saved
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
