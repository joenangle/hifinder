'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'

interface EmailCaptureFormProps {
  source: 'feature_card_guide' | 'bottom_cta_newsletter'
  placeholder?: string
  buttonText?: string
  className?: string
  compact?: boolean
}

export function EmailCaptureForm({
  source,
  placeholder = 'you@email.com',
  buttonText = 'Subscribe',
  className = '',
  compact = false,
}: EmailCaptureFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === 'submitting') return

    setStatus('submitting')
    setErrorMessage('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setErrorMessage(data.error || 'Something went wrong')
        return
      }

      setStatus('success')
      trackEvent({ name: 'email_subscribed', properties: { source } })
    } catch {
      setStatus('error')
      setErrorMessage('Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--success)',
          fontSize: compact ? '14px' : '15px',
          fontWeight: 500,
        }}
      >
        <Check className="h-4 w-4" />
        Check your inbox to confirm
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      style={{
        display: 'flex',
        gap: '8px',
        flexDirection: compact ? 'row' : 'row',
        maxWidth: compact ? '380px' : '420px',
      }}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        required
        style={{
          flex: 1,
          minWidth: 0,
          padding: compact ? '10px 14px' : '12px 16px',
          fontSize: compact ? '14px' : '15px',
          borderRadius: '10px',
          border: '1px solid var(--border-default)',
          background: 'var(--background-primary)',
          color: 'var(--text-primary)',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-primary)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-default)'
        }}
      />
      <button
        type="submit"
        disabled={status === 'submitting'}
        style={{
          padding: compact ? '10px 18px' : '12px 22px',
          fontSize: compact ? '14px' : '15px',
          fontWeight: 600,
          borderRadius: '10px',
          border: 'none',
          background: 'var(--accent-primary)',
          color: '#fff',
          cursor: status === 'submitting' ? 'wait' : 'pointer',
          opacity: status === 'submitting' ? 0.7 : 1,
          transition: 'opacity 0.15s',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {status === 'submitting' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : null}
        {buttonText}
      </button>
      {status === 'error' && errorMessage && (
        <p
          style={{
            position: 'absolute',
            marginTop: compact ? '42px' : '48px',
            fontSize: '13px',
            color: 'var(--error)',
          }}
        >
          {errorMessage}
        </p>
      )}
    </form>
  )
}
