'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import {
  ArrowRight,
  Headphones,
  Layers,
  ShoppingBag,
  Heart,
  Bell,
  Package,
  DollarSign,
  Zap,
} from 'lucide-react'

export function UserDashboard() {
  const { data: session } = useSession()

  const [gear, setGear] = useState<unknown[]>([])
  const [stacks, setStacks] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [collectionStats, setCollectionStats] = useState({
    totalPaid: 0,
    currentValue: 0,
    depreciation: 0,
    byCategory: {} as Record<string, { paid: number; current: number }>,
  })

  const firstName = session?.user?.name?.split(' ')[0] || 'there'

  useEffect(() => {
    if (!session?.user?.id || !session.user.email) return

    const loadUserData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/user/dashboard', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })
        if (!response.ok) throw new Error(`Failed: ${response.status}`)
        const data = await response.json()
        setGear(data.gear || [])
        setStacks(data.stacks || [])
        setCollectionStats(
          data.collectionStats || {
            totalPaid: 0,
            currentValue: 0,
            depreciation: 0,
            byCategory: {},
          }
        )
      } catch (error) {
        console.error('Error loading user data:', error)
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(loadUserData, 100)
    return () => clearTimeout(timer)
  }, [session?.user?.id, session?.user?.email])

  const hasGear = gear.length > 0

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--background-primary)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle grid texture — continuity with landing page */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.3,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0 var(--space-6)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* ── Greeting ── */}
        <section
          style={{
            paddingTop: 'clamp(2.5rem, 6vh, 5rem)',
            paddingBottom: 'clamp(2rem, 4vh, 3.5rem)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <p
            style={{
              fontSize: '0.8rem',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--accent-primary)',
              marginBottom: 'var(--space-4)',
            }}
          >
            Dashboard
          </p>
          <h1
            style={{
              fontSize: 'clamp(2rem, 4.5vw, 3.25rem)',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: '-0.035em',
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-3)',
            }}
          >
            Hey {firstName}.
          </h1>
          <p
            style={{
              fontSize: '1.0625rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              maxWidth: '440px',
            }}
          >
            {hasGear
              ? `${gear.length} component${gear.length !== 1 ? 's' : ''} tracked. What are you looking for next?`
              : 'Build your collection, track values, and find your next upgrade.'}
          </p>
        </section>

        {/* ── Primary Actions — asymmetric 2-column ── */}
        <section
          style={{
            paddingTop: 'clamp(2rem, 4vh, 3rem)',
            paddingBottom: 'clamp(2rem, 4vh, 3rem)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            }}
          >
            {/* Main CTA — recommendations */}
            <Link
              href="/recommendations"
              onClick={() =>
                trackEvent({
                  name: 'dashboard_action_clicked',
                  properties: { action: 'get_recommendations' },
                })
              }
              className="group"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 'var(--space-6) var(--space-6) var(--space-5)',
                borderRadius: '14px',
                border: '1px solid var(--border-default)',
                background: 'var(--surface-card)',
                textDecoration: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                minHeight: '160px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)'
                e.currentTarget.style.boxShadow =
                  '0 8px 24px -8px rgba(var(--accent-primary-rgb), 0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div>
                <Headphones
                  size={20}
                  style={{ color: 'var(--accent-primary)', marginBottom: 'var(--space-4)' }}
                />
                <h2
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-1)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Get Recommendations
                </h2>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  Matched to your preferences and budget
                </p>
              </div>
              <div
                className="flex items-center gap-1.5"
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--accent-primary)',
                  marginTop: 'var(--space-4)',
                }}
              >
                Find gear
                <ArrowRight
                  size={14}
                  className="transition-transform duration-150 group-hover:translate-x-0.5"
                />
              </div>
            </Link>

            {/* Build a Stack */}
            <Link
              href={hasGear ? '/gear?tab=stacks' : '/gear'}
              onClick={() =>
                trackEvent({
                  name: 'dashboard_action_clicked',
                  properties: { action: hasGear ? 'build_stack' : 'add_gear_for_stack' },
                })
              }
              className="group"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 'var(--space-6) var(--space-6) var(--space-5)',
                borderRadius: '14px',
                border: '1px solid var(--border-default)',
                background: 'var(--surface-card)',
                textDecoration: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                minHeight: '160px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)'
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div>
                <Layers
                  size={20}
                  style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}
                />
                <h2
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-1)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Build a Stack
                </h2>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {hasGear
                    ? 'Combine your gear into complete systems'
                    : 'Add gear first, then assemble systems'}
                </p>
              </div>
              <div
                className="flex items-center gap-1.5"
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginTop: 'var(--space-4)',
                }}
              >
                {hasGear ? 'Create system' : 'Add gear'}
                <ArrowRight
                  size={14}
                  className="transition-transform duration-150 group-hover:translate-x-0.5"
                />
              </div>
            </Link>

            {/* Browse Used Market */}
            <Link
              href="/marketplace"
              onClick={() =>
                trackEvent({
                  name: 'dashboard_action_clicked',
                  properties: { action: 'browse_market' },
                })
              }
              className="group"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 'var(--space-6) var(--space-6) var(--space-5)',
                borderRadius: '14px',
                border: '1px solid var(--border-default)',
                background: 'var(--surface-card)',
                textDecoration: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                minHeight: '160px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)'
                e.currentTarget.style.boxShadow = 'var(--shadow-md)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div>
                <ShoppingBag
                  size={20}
                  style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}
                />
                <h2
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--space-1)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Used Market
                </h2>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  Deals on quality used equipment
                </p>
              </div>
              <div
                className="flex items-center gap-1.5"
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginTop: 'var(--space-4)',
                }}
              >
                Browse deals
                <ArrowRight
                  size={14}
                  className="transition-transform duration-150 group-hover:translate-x-0.5"
                />
              </div>
            </Link>
          </div>
        </section>

        {/* ── Collection Strip — inline, no card wrapper ── */}
        {(hasGear || !loading) && (
          <section
            style={{
              paddingTop: 'clamp(2rem, 4vh, 3rem)',
              paddingBottom: 'clamp(2rem, 4vh, 3rem)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 'var(--space-5)' }}
            >
              <h2
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--text-tertiary)',
                }}
              >
                Your Collection
              </h2>
              <Link
                href="/gear"
                onClick={() =>
                  trackEvent({
                    name: 'dashboard_link_clicked',
                    properties: { link: 'view_all_gear' },
                  })
                }
                className="flex items-center gap-1 group"
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
              >
                {hasGear ? 'View all' : 'Add gear'}
                <ArrowRight
                  size={12}
                  className="transition-transform duration-150 group-hover:translate-x-0.5"
                />
              </Link>
            </div>

            {hasGear ? (
              <div
                className="grid gap-0"
                style={{
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                }}
              >
                {[
                  {
                    icon: Package,
                    value: loading ? '\u2014' : `${gear.length}`,
                    label: 'Components',
                  },
                  {
                    icon: DollarSign,
                    value: loading ? '\u2014' : formatCurrency(collectionStats.currentValue),
                    label: 'Current value',
                  },
                  {
                    icon: Layers,
                    value: loading ? '\u2014' : `${stacks.length}`,
                    label: 'Stacks',
                  },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    style={{
                      padding: 'var(--space-4) 0',
                      borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                      paddingLeft: i > 0 ? 'var(--space-6)' : '0',
                    }}
                  >
                    <stat.icon
                      size={15}
                      style={{
                        color: 'var(--text-tertiary)',
                        marginBottom: 'var(--space-2)',
                      }}
                    />
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.03em',
                        lineHeight: 1.1,
                      }}
                    >
                      {stat.value}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-tertiary)',
                        marginTop: '4px',
                      }}
                    >
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: 'var(--space-8) 0 var(--space-4)',
                  textAlign: 'left',
                }}
              >
                <p
                  style={{
                    fontSize: '0.9375rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    marginBottom: 'var(--space-5)',
                    maxWidth: '400px',
                  }}
                >
                  Track your gear, monitor depreciation, and get upgrade suggestions
                  based on what you own.
                </p>
                <Link
                  href="/dashboard?tab=gear"
                  onClick={() =>
                    trackEvent({
                      name: 'dashboard_action_clicked',
                      properties: { action: 'add_gear' },
                    })
                  }
                  className="inline-flex items-center gap-2 group"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    background: 'var(--background-secondary)',
                    border: '1px solid var(--border-default)',
                    padding: 'var(--space-2) var(--space-4)',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                >
                  Add your first component
                  <ArrowRight
                    size={14}
                    className="transition-transform duration-150 group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            )}
          </section>
        )}

        {/* ── Budget Tiers — horizontal row with distinct sizing ── */}
        <section
          style={{
            paddingTop: 'clamp(2rem, 4vh, 3rem)',
            paddingBottom: 'clamp(2rem, 4vh, 3rem)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <h2
            style={{
              fontSize: '0.8rem',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-tertiary)',
              marginBottom: 'var(--space-5)',
            }}
          >
            Jump in by budget
          </h2>

          <div className="flex gap-3 overflow-x-auto" style={{ paddingBottom: '2px' }}>
            {[
              { label: 'Budget', range: '$20\u2013100', budget: 75, accent: false },
              { label: 'Entry', range: '$100\u2013400', budget: 250, accent: false },
              { label: 'Mid-fi', range: '$400\u20131k', budget: 700, accent: false },
              { label: 'Hi-fi', range: '$1k\u20133k+', budget: 2000, accent: true },
            ].map((tier) => (
              <Link
                key={tier.label}
                href={`/recommendations?b=${tier.budget}&source=quick-start`}
                onClick={() =>
                  trackEvent({
                    name: 'dashboard_budget_clicked',
                    properties: { budget: tier.budget },
                  })
                }
                className="group"
                style={{
                  flex: '1 0 auto',
                  minWidth: '120px',
                  padding: 'var(--space-4) var(--space-5)',
                  borderRadius: '10px',
                  border: `1px solid ${tier.accent ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                  background: tier.accent
                    ? 'rgba(var(--accent-primary-rgb), 0.06)'
                    : 'var(--surface-card)',
                  textDecoration: 'none',
                  transition: 'border-color 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!tier.accent) {
                    e.currentTarget.style.borderColor = 'var(--text-tertiary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!tier.accent) {
                    e.currentTarget.style.borderColor = 'var(--border-default)'
                  }
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: tier.accent ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    letterSpacing: '0.02em',
                    marginBottom: '2px',
                  }}
                >
                  {tier.label}
                </div>
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {tier.range}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Secondary — compact row ── */}
        <section
          style={{
            paddingTop: 'clamp(1.5rem, 3vh, 2.5rem)',
            paddingBottom: 'clamp(3rem, 6vh, 5rem)',
          }}
        >
          <div className="flex flex-wrap gap-3">
            <Link
              href="/wishlist"
              onClick={() =>
                trackEvent({
                  name: 'dashboard_action_clicked',
                  properties: { action: 'view_wishlist' },
                })
              }
              className="flex items-center gap-2.5 group"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--surface-card)',
                textDecoration: 'none',
                transition: 'border-color 0.15s ease',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--text-tertiary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)'
              }}
            >
              <Heart size={15} style={{ color: 'var(--text-tertiary)' }} />
              Wishlist
              <ArrowRight
                size={12}
                style={{ color: 'var(--text-tertiary)' }}
                className="transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </Link>

            <Link
              href="/alerts"
              onClick={() =>
                trackEvent({
                  name: 'dashboard_action_clicked',
                  properties: { action: 'view_alerts' },
                })
              }
              className="flex items-center gap-2.5 group"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--surface-card)',
                textDecoration: 'none',
                transition: 'border-color 0.15s ease',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--text-tertiary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)'
              }}
            >
              <Bell size={15} style={{ color: 'var(--text-tertiary)' }} />
              Price Alerts
              <ArrowRight
                size={12}
                style={{ color: 'var(--text-tertiary)' }}
                className="transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </Link>

            <Link
              href="/gear"
              onClick={() =>
                trackEvent({
                  name: 'dashboard_action_clicked',
                  properties: { action: 'my_collection' },
                })
              }
              className="flex items-center gap-2.5 group"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--surface-card)',
                textDecoration: 'none',
                transition: 'border-color 0.15s ease',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--text-tertiary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default)'
              }}
            >
              <Zap size={15} style={{ color: 'var(--text-tertiary)' }} />
              My Gear
              <ArrowRight
                size={12}
                style={{ color: 'var(--text-tertiary)' }}
                className="transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
