'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { EmailCaptureForm } from './EmailCaptureForm'
import { TrackableAnchor } from './TrackableAnchor'
import { trackEvent } from '@/lib/analytics'

// CSS-based fade-in replaces framer-motion (only animation this component
// needed — roughly 80KB of deps saved from the landing-page initial bundle).
const fadeInStyle: React.CSSProperties = {
  animation: 'collapsible-email-fade-in 200ms ease-out',
}

export function CollapsibleEmailSignup() {
  const [expanded, setExpanded] = useState(false)

  function handleExpand() {
    setExpanded(true)
    trackEvent({ name: 'newsletter_expand_clicked', properties: { location: 'bottom_cta' } })
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <style>{`
        @keyframes collapsible-email-fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {!expanded ? (
        <button
          onClick={handleExpand}
          className="text-sm group"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          Not ready yet?{' '}
          <span
            className="font-medium"
            style={{
              color: 'var(--text-primary)',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              textDecorationColor: 'var(--border-default)',
            }}
          >
            Get weekly gear picks
          </span>
          <ChevronRight
            className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
            style={{ color: 'var(--text-tertiary)' }}
          />
        </button>
      ) : (
        <div style={fadeInStyle}>
          <p
            className="text-sm mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            Get weekly gear picks in your inbox.
          </p>
          <EmailCaptureForm
            source="bottom_cta_newsletter"
            buttonText="Subscribe"
            compact
          />
        </div>
      )}

      <TrackableAnchor
        href="mailto:hello@hifinder.app?subject=Help%20choosing%20audio%20gear"
        event={{ name: 'help_mailto_clicked', properties: { location: 'bottom_cta' } }}
        className="text-sm hover:underline"
        style={{
          color: 'var(--text-tertiary)',
          marginTop: '12px',
          display: 'inline-block',
          textUnderlineOffset: '3px',
        }}
      >
        Or email us &mdash; we&apos;re happy to help
      </TrackableAnchor>
    </div>
  )
}
