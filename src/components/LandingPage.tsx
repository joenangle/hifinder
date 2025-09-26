'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

interface SiteStats {
  components: number
  listings: number
  budgetRange: {
    min: number
    max: number
  }
}

export function LandingPage() {
  const [stats, setStats] = useState<SiteStats>({
    components: 550,
    listings: 0,
    budgetRange: { min: 20, max: 10000 }
  })

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.warn('Failed to load stats, using fallback:', err))
  }, [])

  return (
    <main className="page-container relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
        backgroundSize: '24px 24px'
      }}></div>

      <div className="max-w-6xl w-full relative">

        {/* Simplified Hero Section */}
        <section className="text-center mb-16 mt-12">
          {/* Logo and Brand */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center border border-accent/20">
              <span className="text-xl">🎧</span>
            </div>
            <h1 className="text-4xl font-bold text-primary">
              HiFinder
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-accent/70 font-medium text-xs mb-6 tracking-wider uppercase">
            Your Audio Gear Guide
          </p>

          {/* Main Description */}
          <p className="text-secondary text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Build your perfect audio setup with personalized recommendations and real market data
          </p>

          {/* Primary CTA - Simplified */}
          <div className="mb-6">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 px-8 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
              onClick={() => trackEvent({ name: 'hero_cta_clicked', properties: { location: 'hero_primary' } })}
            >
              Find My Perfect Setup
            </Link>
          </div>

          {/* Trust Signals - Smaller */}
          <div className="flex flex-wrap justify-center gap-4 mb-8 text-xs text-tertiary">
            <span>✓ Free forever</span>
            <span>✓ No signup required</span>
            <span>✓ 5-minute setup</span>
          </div>

          {/* Secondary Actions - Simplified */}
          <div className="flex gap-3 justify-center">
            <Link
              href="/learn"
              className="text-sm text-secondary hover:text-primary transition-colors"
            >
              Learn Basics →
            </Link>
            <span className="text-tertiary">•</span>
            <Link
              href="#how-it-works"
              className="text-sm text-secondary hover:text-primary transition-colors"
            >
              How it works →
            </Link>
          </div>
        </section>

        {/* Quick Stats - Simplified */}
        <section className="mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: stats.components >= 1000 ? `${Math.round(stats.components / 100) / 10}k+` : `${stats.components}+`, label: 'Components' },
              { value: '$20-10k', label: 'Budget Range' },
              { value: stats.listings >= 1000 ? `${Math.round(stats.listings / 100) / 10}k+` : `${stats.listings}+`, label: 'Used Listings' },
              { value: 'Smart', label: 'Tracking' }
            ].map((stat, i) => (
              <div key={i} className="text-center p-4 bg-secondary/5 rounded-lg">
                <div className="text-2xl font-bold text-accent/80 mb-1">{stat.value}</div>
                <div className="text-xs text-tertiary">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Core Features - Cleaner */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            Complete Audio Gear Management
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                href: '/gear',
                icon: '📦',
                title: 'Gear Collection',
                subtitle: 'Track & manage',
                description: 'Track your audio gear, monitor values, and discover upgrade paths.'
              },
              {
                href: '/gear?tab=stacks',
                icon: '🏗️',
                title: 'Stack Builder',
                subtitle: 'Create systems',
                description: 'Build complete audio systems and find perfect synergies.'
              },
              {
                href: '/used-market',
                icon: '🛒',
                title: 'Used Market',
                subtitle: 'Find deals',
                description: 'Browse used gear from multiple sources and get price alerts.'
              },
              {
                href: '/onboarding',
                icon: '🎯',
                title: 'Smart Recommendations',
                subtitle: 'Get personalized',
                description: 'Science-based recommendations tailored to your needs.'
              }
            ].map((feature, i) => (
              <Link
                key={i}
                href={feature.href}
                className="group p-5 bg-surface-card border border-border-default rounded-lg hover:border-accent/30 transition-all"
                onClick={() => trackEvent({ name: 'feature_clicked', properties: { feature: feature.title.toLowerCase().replace(' ', '_') } })}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-accent/15 transition-colors">
                    <span className="text-base">{feature.icon}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-primary mb-0.5">{feature.title}</h3>
                    <p className="text-accent/70 text-xs font-medium mb-2">{feature.subtitle} →</p>
                    <p className="text-secondary text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Why HiFinder - Simplified */}
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 bg-surface-card rounded-lg border border-border-default">
              <h2 className="text-2xl font-bold mb-4">Why HiFinder?</h2>
              <div className="space-y-3">
                {[
                  { title: 'Science-Based', desc: 'Recommendations based on measurements, not marketing hype' },
                  { title: 'Personalized', desc: 'Considers your experience, budget, and existing gear' },
                  { title: 'No Overwhelm', desc: 'Curated recommendations that actually fit your needs' },
                  { title: 'Always Learning', desc: 'Database updated with new products continuously' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-accent/60 mt-0.5">✓</span>
                    <div>
                      <h4 className="font-medium text-primary mb-0.5">{item.title}</h4>
                      <p className="text-secondary text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-accent/5 rounded-lg border border-accent/20">
              <h3 className="text-xl font-semibold mb-3">Tired of research paralysis?</h3>
              <p className="text-secondary mb-4">
                Stop spending weeks reading conflicting reviews. Get personalized recommendations in minutes.
              </p>
              <Link
                href="/onboarding"
                className="inline-block w-full text-center px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
              >
                Start Finding Your Setup →
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works - Cleaner */}
        <section id="how-it-works" className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">How HiFinder Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '📊', title: '1. Smart Analysis', desc: 'Algorithms analyze measurements and component synergy' },
              { icon: '🎧', title: '2. Build & Track', desc: 'Create stacks, track collection value, get price alerts' },
              { icon: '💰', title: '3. Find Deals', desc: 'Access live market data and optimize your budget' }
            ].map((step, i) => (
              <div key={i} className="text-center p-5 bg-surface-card rounded-lg border border-border-default">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <span>{step.icon}</span>
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-secondary text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Budget Quick Start - Simplified */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-3">Popular Budget Ranges</h2>
          <p className="text-secondary text-center mb-6 text-sm">Jump straight to recommendations</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Budget', range: '$20-100', budget: 75 },
              { label: 'Entry Level', range: '$100-400', budget: 250 },
              { label: 'Mid Range', range: '$400-1k', budget: 700 },
              { label: 'High End', range: '$1k-3k+', budget: 2000 }
            ].map((tier, i) => (
              <Link
                key={i}
                href={`/recommendations?budget=${tier.budget}&source=quick-start`}
                className="p-4 text-center bg-surface-card rounded-lg border border-border-default hover:border-accent/30 transition-colors"
                onClick={() => trackEvent({ name: 'budget_quick_start_clicked', properties: { budget_tier: tier.label.toLowerCase().replace(' ', '_'), budget_amount: tier.budget } })}
              >
                <div className="font-medium text-sm mb-1">{tier.label}</div>
                <div className="text-lg font-bold text-accent/80 mb-1">{tier.range}</div>
                <div className="text-xs text-accent/60">Quick Start →</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Final CTA - Minimal */}
        <section className="text-center p-8 bg-accent/5 rounded-lg">
          <h2 className="text-2xl font-bold mb-2">Ready to Find Your Perfect Audio Setup?</h2>
          <p className="text-secondary mb-6">
            Get science-based recommendations in minutes.
          </p>
          <Link
            href="/onboarding"
            className="inline-block px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
          >
            Start Your Audio Journey →
          </Link>
          <p className="text-tertiary text-xs mt-3">Free • No signup • 5 minutes</p>
        </section>
      </div>
    </main>
  )
}