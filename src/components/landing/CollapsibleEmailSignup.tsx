'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { EmailCaptureForm } from './EmailCaptureForm'
import { TrackableAnchor } from './TrackableAnchor'
import { trackEvent } from '@/lib/analytics'

export function CollapsibleEmailSignup() {
  const [expanded, setExpanded] = useState(false)

  function handleExpand() {
    setExpanded(true)
    trackEvent({ name: 'newsletter_expand_clicked', properties: { location: 'bottom_cta' } })
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <AnimatePresence mode="wait">
        {!expanded ? (
          <motion.button
            key="trigger"
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
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
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
          </motion.button>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>

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
