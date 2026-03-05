'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Headphones, Ear } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import type { Component } from '@/types'

interface CuratedSystem {
  id: string
  name: string
  description: string
  category: 'iems' | 'cans'
  budget_tier: number
  rationale: string
  components: Component[]
}

const BUDGET_LABELS: Record<number, string> = {
  100: '$100',
  250: '$250',
  500: '$500',
  1000: '$1,000',
}

export function CuratedSystems() {
  const [systems, setSystems] = useState<CuratedSystem[]>([])
  const [activeTab, setActiveTab] = useState<'cans' | 'iems'>('cans')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/curated-systems')
      .then(res => res.json())
      .then(data => {
        setSystems(data.systems || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = systems.filter(s => s.category === activeTab)

  if (loading) {
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
            Popular systems
          </p>
          <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                style={{
                  background: 'var(--background-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '28px',
                  height: '240px',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (systems.length === 0) return null

  return (
    <section style={{ padding: '100px 0' }}>
      <div className="container mx-auto px-6" style={{ maxWidth: '1100px' }}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <p
            className="text-xs font-semibold"
            style={{
              color: 'var(--accent-primary)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Popular systems
          </p>

          {/* Tab toggle */}
          <div
            className="inline-flex"
            style={{
              background: 'var(--background-secondary)',
              border: '1px solid var(--border-default)',
              borderRadius: '10px',
              padding: '3px',
            }}
          >
            {([
              { key: 'cans' as const, label: 'Over-ear', icon: <Headphones className="h-3.5 w-3.5" /> },
              { key: 'iems' as const, label: 'In-ear', icon: <Ear className="h-3.5 w-3.5" /> },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="inline-flex items-center gap-1.5 text-xs font-medium transition-all duration-150 cursor-pointer"
                style={{
                  padding: '7px 14px',
                  borderRadius: '7px',
                  background: activeTab === tab.key ? 'var(--background-primary)' : 'transparent',
                  color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  border: 'none',
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-5">
          {filtered.map(system => {
            const totalPrice = system.components.reduce(
              (sum, c) => sum + (c.price_new || 0),
              0
            )
            const componentIds = system.components.map(c => c.id).join(',')
            const href = `/recommendations?components=${componentIds}&b=${system.budget_tier}`

            return (
              <Link
                key={system.id}
                href={href}
                className="group block"
                style={{
                  background: 'var(--background-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '16px',
                  padding: '28px',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--border-default)'
                  e.currentTarget.style.boxShadow = '0 8px 32px -8px rgba(0,0,0,0.12)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onClick={() =>
                  trackEvent({
                    name: 'curated_system_clicked',
                    properties: {
                      system_name: system.name,
                      budget_tier: system.budget_tier,
                      category: system.category,
                    },
                  })
                }
              >
                {/* Budget badge */}
                <span
                  className="text-xs font-semibold"
                  style={{
                    display: 'inline-block',
                    background: 'rgba(var(--accent-primary-rgb), 0.1)',
                    color: 'var(--accent-primary)',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    marginBottom: '14px',
                  }}
                >
                  {BUDGET_LABELS[system.budget_tier] || `$${system.budget_tier}`}
                </span>

                {/* System name */}
                <h3
                  className="font-semibold mb-3"
                  style={{
                    fontSize: '1rem',
                    color: 'var(--text-primary)',
                    lineHeight: 1.3,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {system.name}
                </h3>

                {/* Component list */}
                <div className="mb-4" style={{ minHeight: '60px' }}>
                  {system.components.map(c => (
                    <p
                      key={c.id}
                      className="text-xs"
                      style={{
                        color: 'var(--text-secondary)',
                        lineHeight: 1.8,
                      }}
                    >
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {c.brand}
                      </span>{' '}
                      {c.name}
                    </p>
                  ))}
                </div>

                {/* Total price */}
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  ${totalPrice.toLocaleString()}
                </p>

                {/* Description */}
                <p
                  className="text-xs"
                  style={{
                    color: 'var(--text-tertiary)',
                    lineHeight: 1.6,
                    marginBottom: '16px',
                  }}
                >
                  {system.description}
                </p>

                {/* CTA */}
                <div
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{
                    color: 'var(--text-tertiary)',
                    transition: 'color 0.15s',
                  }}
                >
                  <span className="group-hover:text-[var(--text-primary)] transition-colors duration-150">
                    Try this setup
                  </span>
                  <ArrowRight className="h-3 w-3 transition-[color,transform] duration-150 group-hover:translate-x-1 group-hover:text-[var(--text-primary)]" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
