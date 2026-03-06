'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import { trackEvent } from '@/lib/analytics'
import { ArrowRight, SlidersHorizontal, ShoppingBag, Layers, BookOpen, Mail, Check, ChevronDown } from 'lucide-react'
import { EmailCaptureForm } from './EmailCaptureForm'

const features = [
  {
    icon: <SlidersHorizontal className="h-5 w-5" />,
    title: 'Smart Recommendations',
    description:
      'Answer a few questions about how you listen and what you own. We surface gear that genuinely fits — ranked by measurements, synergy, and budget.',
    href: '/recommendations',
    tag: 'Most used',
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: 'Stack Builder',
    description:
      'Build a full chain — source, DAC, amp, headphones. See how the components pair, where the bottlenecks are, and what a complete system costs.',
    href: '/gear?tab=stacks',
    tag: null,
  },
  {
    icon: <ShoppingBag className="h-5 w-5" />,
    title: 'Used Market',
    description:
      'Browse aggregated listings from communities and resellers. Save searches, track price history, get alerts when something you want drops.',
    href: '/marketplace',
    tag: null,
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: 'Learn the Basics',
    description:
      "Not sure what a DAC does or why impedance matters? Our guides are written for people who want better sound — not audio engineers.",
    href: '/learn',
    tag: null,
  },
]

const cardStyle = {
  background: 'var(--background-secondary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '16px',
  padding: '32px',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  textDecoration: 'none' as const,
}

function handleCardHover(e: React.MouseEvent, enter: boolean) {
  const el = e.currentTarget as HTMLElement
  el.style.borderColor = enter ? 'var(--border-default)' : 'var(--border-subtle)'
  el.style.boxShadow = enter ? '0 8px 32px -8px rgba(0,0,0,0.12)' : 'none'
}

const STACK_BUILDER_BULLETS = [
  'Organize gear into complete audio chains',
  'See component synergy and compatibility',
  'Track total system cost at a glance',
]

function StackBuilderPreview() {
  return (
    <div
      style={{
        marginTop: '16px',
        padding: '20px',
        borderRadius: '12px',
        background: 'var(--background-primary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px' }}>
        {STACK_BUILDER_BULLETS.map((item) => (
          <li
            key={item}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              padding: '6px 0',
            }}
          >
            <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} />
            {item}
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={() => {
            trackEvent({ name: 'feature_clicked', properties: { feature: 'stack_builder_signin' } })
            signIn()
          }}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '10px',
            border: 'none',
            background: 'var(--accent-primary)',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Sign in to start
        </button>
        <Link
          href="/recommendations"
          onClick={() =>
            trackEvent({ name: 'feature_clicked', properties: { feature: 'stack_builder_alt_recs' } })
          }
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 500,
            borderRadius: '10px',
            border: '1px solid var(--border-default)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          See recommendations first
        </Link>
      </div>
    </div>
  )
}

export function FeatureCards() {
  const { data: session } = useSession()
  const [stackExpanded, setStackExpanded] = useState(false)

  return (
    <section style={{ padding: '100px 0' }}>
      <div className="container mx-auto px-6" style={{ maxWidth: '1100px' }}>
        <h2
          className="text-xs font-semibold mb-6"
          style={{
            color: 'var(--accent-primary)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontSize: '0.75rem',
          }}
        >
          What HiFinder does
        </h2>

        <div className="grid lg:grid-cols-2 gap-6">
          {features.map((f) => {
            const isStackBuilder = f.title === 'Stack Builder'

            // Stack Builder: unauthenticated users get inline preview
            if (isStackBuilder && !session) {
              return (
                <div
                  key={f.title}
                  className="group"
                  style={cardStyle}
                  onMouseEnter={(e) => handleCardHover(e, true)}
                  onMouseLeave={(e) => handleCardHover(e, false)}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '10px',
                        background: 'var(--background-primary)',
                        border: '1px solid var(--border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {f.icon}
                    </div>
                    <span
                      className="text-xs font-medium"
                      style={{
                        background: 'rgba(var(--accent-primary-rgb), 0.1)',
                        color: 'var(--accent-primary)',
                        padding: '4px 10px',
                        borderRadius: '999px',
                      }}
                    >
                      Requires sign-in
                    </span>
                  </div>

                  <h3
                    className="font-semibold mb-2"
                    style={{ fontSize: '1.0625rem', color: 'var(--text-primary)', lineHeight: 1.3, fontFamily: 'var(--font-display)' }}
                  >
                    {f.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
                  >
                    {f.description}
                  </p>

                  {stackExpanded ? (
                    <StackBuilderPreview />
                  ) : (
                    <button
                      onClick={() => {
                        setStackExpanded(true)
                        trackEvent({ name: 'feature_clicked', properties: { feature: 'stack_builder_preview' } })
                      }}
                      className="flex items-center gap-1 mt-6 text-sm font-medium"
                      style={{
                        color: 'var(--text-tertiary)',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-tertiary)'
                      }}
                    >
                      <span>Learn more</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )
            }

            // Standard feature card (link)
            return (
              <Link
                key={f.title}
                href={f.href}
                className="group block"
                style={cardStyle}
                onMouseEnter={(e) => handleCardHover(e, true)}
                onMouseLeave={(e) => handleCardHover(e, false)}
                onClick={() =>
                  trackEvent({
                    name: 'feature_clicked',
                    properties: { feature: f.title.toLowerCase().replace(/ /g, '_') },
                  })
                }
              >
                <div className="flex items-start justify-between mb-5">
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      background: 'var(--background-primary)',
                      border: '1px solid var(--border-default)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {f.icon}
                  </div>
                  {f.tag && (
                    <span
                      className="text-xs font-medium"
                      style={{
                        background: 'rgba(var(--accent-primary-rgb), 0.1)',
                        color: 'var(--accent-primary)',
                        padding: '4px 10px',
                        borderRadius: '999px',
                      }}
                    >
                      {f.tag}
                    </span>
                  )}
                </div>

                <h3
                  className="font-semibold mb-2"
                  style={{ fontSize: '1.0625rem', color: 'var(--text-primary)', lineHeight: 1.3, fontFamily: 'var(--font-display)' }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
                >
                  {f.description}
                </p>

                <div
                  className="flex items-center gap-1 mt-6 text-sm font-medium"
                  style={{
                    color: 'var(--text-tertiary)',
                    transition: 'color 0.15s, gap 0.15s',
                  }}
                >
                  <span className="group-hover:text-[var(--text-primary)] transition-colors duration-150">
                    Explore
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 transition-[color,transform] duration-150 group-hover:translate-x-1 group-hover:text-[var(--text-primary)]" />
                </div>
              </Link>
            )
          })}

          {/* 5th card — email capture for guide download */}
          <div
            className="lg:col-span-2"
            style={{
              ...cardStyle,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '32px',
              flexWrap: 'wrap',
            }}
            onMouseEnter={(e) => handleCardHover(e, true)}
            onMouseLeave={(e) => handleCardHover(e, false)}
          >
            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
              <div className="flex items-start justify-between mb-5">
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    background: 'var(--background-primary)',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <Mail className="h-5 w-5" />
                </div>
                <span
                  className="text-xs font-medium"
                  style={{
                    background: 'rgba(var(--accent-primary-rgb), 0.1)',
                    color: 'var(--accent-primary)',
                    padding: '4px 10px',
                    borderRadius: '999px',
                  }}
                >
                  Free download
                </span>
              </div>
              <h3
                className="font-semibold mb-2"
                style={{ fontSize: '1.0625rem', color: 'var(--text-primary)', lineHeight: 1.3, fontFamily: 'var(--font-display)' }}
              >
                Headphone Buyer&apos;s Cheat Sheet
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
              >
                Sound signatures, price tiers, and what to look for — explained without jargon. Get the one-page guide that cuts through the noise.
              </p>
            </div>
            <div style={{ flex: '1 1 280px', minWidth: 0 }}>
              <EmailCaptureForm
                source="feature_card_guide"
                buttonText="Send me the guide"
                placeholder="you@email.com"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
