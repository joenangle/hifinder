'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession, signIn } from 'next-auth/react'
import { trackEvent } from '@/lib/analytics'
import { ArrowRight, SlidersHorizontal, ShoppingBag, Layers, BookOpen, Mail, Check, ChevronDown } from 'lucide-react'
import { EmailCaptureForm } from './EmailCaptureForm'

// Previews captured via `npm run capture:screenshots`.
// Stack Builder requires auth — `stacks.webp` is a signed-in dark-mode capture
// committed separately; it's used for both themes until a light-mode version exists.
const features = [
  {
    icon: <SlidersHorizontal className="h-5 w-5" />,
    title: 'Smart Recommendations',
    description:
      'Answer a few questions about how you listen and what you own. HiFinder surfaces gear that genuinely fits — ranked by measurements, synergy, and budget.',
    href: '/recommendations',
    tag: 'Most used',
    previewLight: '/images/screenshots/recommendations-light.webp',
    previewDark: '/images/screenshots/recommendations-dark.webp',
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: 'Stack Builder',
    description:
      'Build a full chain — source, DAC, amp, headphones. See how the components pair, where the bottlenecks are, and what a complete system costs.',
    href: '/gear?tab=stacks',
    tag: null,
    previewLight: '/images/screenshots/stacks.webp',
    previewDark: '/images/screenshots/stacks.webp',
  },
  {
    icon: <ShoppingBag className="h-5 w-5" />,
    title: 'Used Market',
    description:
      'Browse aggregated listings from communities and resellers. Save searches, track price history, get alerts when something you want drops.',
    href: '/marketplace',
    tag: null,
    previewLight: '/images/screenshots/marketplace-light.webp',
    previewDark: '/images/screenshots/marketplace-dark.webp',
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: 'Learn the Basics',
    description:
      "Not sure what a DAC does or why impedance matters? These guides are written for people who want better sound — not audio engineers.",
    href: '/learn',
    tag: null,
    previewLight: '/images/screenshots/learn-light.webp',
    previewDark: '/images/screenshots/learn-dark.webp',
  },
]

const cardStyle = {
  background: 'var(--background-secondary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '16px',
  padding: 'clamp(20px, 4vw, 32px)',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  textDecoration: 'none' as const,
  minWidth: 0,
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

function PreviewImage({ light, dark, alt }: { light: string; dark: string; alt: string }) {
  const wrapperStyle = {
    borderRadius: 8,
    border: '1px solid var(--border-subtle)',
    maxHeight: 140,
  }
  const imageStyle = { objectFit: 'cover' as const, objectPosition: 'top' as const, display: 'block' }
  return (
    <>
      <div className="mt-4 overflow-hidden theme-light-only" style={wrapperStyle}>
        <Image
          src={light}
          alt={alt}
          width={1280}
          height={800}
          className="w-full h-auto"
          style={imageStyle}
        />
      </div>
      <div className="mt-4 overflow-hidden theme-dark-only" style={wrapperStyle}>
        <Image
          src={dark}
          alt={alt}
          width={1280}
          height={800}
          className="w-full h-auto"
          style={imageStyle}
        />
      </div>
    </>
  )
}

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
            <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
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
    <section style={{ padding: 'clamp(48px, 8vw, 100px) 0' }}>
      <div className="container mx-auto px-6" style={{ maxWidth: '1100px' }}>
        <h2
          className="font-semibold mb-6"
          style={{
            color: 'var(--accent-secondary)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontSize: '1rem',
          }}
        >
          What HiFinder does
        </h2>

        <div className="grid lg:grid-cols-2 gap-6 overflow-hidden">
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
                        background: 'rgba(var(--accent-secondary-rgb), 0.1)',
                        color: 'var(--accent-secondary)',
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

                  {f.previewLight && f.previewDark && (
                    <PreviewImage
                      light={f.previewLight}
                      dark={f.previewDark}
                      alt={`${f.title} preview`}
                    />
                  )}

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
                        background: 'rgba(var(--accent-secondary-rgb), 0.1)',
                        color: 'var(--accent-secondary)',
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

                {f.previewLight && f.previewDark && (
                  <PreviewImage
                    light={f.previewLight}
                    dark={f.previewDark}
                    alt={`${f.title} preview`}
                  />
                )}

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
                    background: 'rgba(var(--accent-secondary-rgb), 0.1)',
                    color: 'var(--accent-secondary)',
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
