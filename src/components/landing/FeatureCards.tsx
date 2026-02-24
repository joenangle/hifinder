'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import { ArrowRight, SlidersHorizontal, ShoppingBag, Layers, BookOpen } from 'lucide-react'

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
    href: '/dashboard?tab=stacks',
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

export function FeatureCards() {
  return (
    <section style={{ padding: '100px 0' }}>
      <div className="container mx-auto px-6" style={{ maxWidth: '1100px' }}>
        <p
          className="text-xs font-semibold mb-6"
          style={{
            color: 'var(--accent-primary)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          What HiFinder does
        </p>

        <div className="grid lg:grid-cols-2 gap-6">
          {features.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="group block"
              style={{
                background: 'var(--background-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '32px',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px -8px rgba(0,0,0,0.12)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'
                ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
              }}
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
                style={{ fontSize: '1.0625rem', color: 'var(--text-primary)', lineHeight: 1.3 }}
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
                <ArrowRight className="h-3.5 w-3.5 transition-all duration-150 group-hover:translate-x-1 group-hover:text-[var(--text-primary)]" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
