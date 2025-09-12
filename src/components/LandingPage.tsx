'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

export function LandingPage() {
  return (
    <main className="page-container relative">
      {/* Background pattern - Phase 2 with all sections deployed */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }}></div>
      <div className="max-w-6xl w-full relative">
        
        {/* Hero Section with Prominent CTA */}
        <section className="text-center mb-8 mt-6 animate-slideUp relative">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/10 rounded-2xl -mx-4 -my-2"></div>
          <div className="relative">
          {/* Logo and Brand */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-accent to-accent-hover rounded-2xl flex items-center justify-center shadow-xl border-2 border-accent/20">
              <span className="text-2xl">🎧</span>
            </div>
            <h1 className="heading-1 bg-gradient-to-r from-foreground via-foreground to-accent bg-clip-text text-transparent mb-0">
              HiFinder
            </h1>
          </div>
          
          {/* Tagline */}
          <p className="text-accent font-semibold text-sm mb-4 tracking-wide uppercase">
            Your Audio Gear Guide
          </p>
          
          {/* Main Description */}
          <p className="text-secondary text-xl mb-6 max-w-2xl mx-auto leading-relaxed">
            Build, track, and optimize your audio gear collection with personalized recommendations,
            stack management, and used market integration
          </p>
          
          {/* Primary CTA - Very Prominent */}
          <div className="mb-6">
            <Link 
              href="/onboarding"
              className="button button-primary button-lg inline-flex items-center gap-3 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent border-2 border-accent/20"
              onClick={() => trackEvent({ name: 'hero_cta_clicked', properties: { location: 'hero_primary' } })}
            >
              🎯 Find My Perfect Setup
            </Link>
          </div>
          
          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm text-secondary">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>Free forever</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>No signup required</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span>5-minute setup</span>
            </div>
          </div>
          
          {/* Secondary Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/learn"
              className="button button-secondary"
              onClick={() => trackEvent({ name: 'learn_clicked', properties: { location: 'hero_secondary' } })}
            >
              📚 Learn Audio Basics
            </Link>
            <Link 
              href="#how-it-works"
              className="button button-secondary"
              onClick={() => trackEvent({ name: 'how_it_works_clicked', properties: { location: 'hero_secondary' } })}
            >
              How It Works ↓
            </Link>
          </div>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="mb-8 py-3 animate-fadeIn">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
            <div className="card text-center p-4 bg-gradient-to-br from-surface-card to-surface-hover border-2 hover:border-accent/30 transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold text-accent mb-2">1,200+</div>
              <div className="text-foreground text-sm font-semibold">Components</div>
            </div>
            <div className="card text-center p-4 bg-gradient-to-br from-surface-card to-surface-hover border-2 hover:border-accent/30 transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold text-accent mb-2">$20-10k</div>
              <div className="text-foreground text-sm font-semibold">Budget Range</div>
            </div>
            <div className="card text-center p-4 bg-gradient-to-br from-surface-card to-surface-hover border-2 hover:border-accent/30 transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold text-accent mb-2">Live</div>
              <div className="text-foreground text-sm font-semibold">Used Market</div>
            </div>
            <div className="card text-center p-4 bg-gradient-to-br from-surface-card to-surface-hover border-2 hover:border-accent/30 transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold text-accent mb-2">Smart</div>
              <div className="text-foreground text-sm font-semibold">Tracking</div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section className="mb-8 py-6">
          <h2 className="heading-2 text-center mb-6 bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">Complete Audio Gear Management</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {/* Gear Collection */}
            <Link href="/gear" className="card p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30 group" onClick={() => trackEvent({ name: 'feature_clicked', properties: { feature: 'gear_collection' } })}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 ring-2 ring-accent/10">
                  <span className="text-lg">📦</span>
                </div>
                <div>
                  <h3 className="heading-3 font-semibold">Gear Collection</h3>
                  <p className="text-accent text-sm font-medium">Track & manage →</p>
                </div>
              </div>
              <p className="text-secondary leading-relaxed">
                Track your audio gear, monitor values, set up price alerts, and discover upgrade paths. 
                Keep detailed records of your entire setup.
              </p>
            </Link>
            
            {/* Stack Builder */}
            <Link href="/gear?tab=stacks" className="card p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30 group" onClick={() => trackEvent({ name: 'feature_clicked', properties: { feature: 'stack_builder' } })}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 ring-2 ring-accent/10">
                  <span className="text-lg">🏗️</span>
                </div>
                <div>
                  <h3 className="heading-3 font-semibold">Stack Builder</h3>
                  <p className="text-accent text-sm font-medium">Create systems →</p>
                </div>
              </div>
              <p className="text-secondary leading-relaxed">
                Build and compare complete audio systems. Test different combinations, 
                calculate total costs, and find the perfect synergy.
              </p>
            </Link>
            
            {/* Used Market */}
            <Link href="/used-market" className="card p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30 group" onClick={() => trackEvent({ name: 'feature_clicked', properties: { feature: 'used_market' } })}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 ring-2 ring-accent/10">
                  <span className="text-lg">🛒</span>
                </div>
                <div>
                  <h3 className="heading-3 font-semibold">Used Market</h3>
                  <p className="text-accent text-sm font-medium">Find deals →</p>
                </div>
              </div>
              <p className="text-secondary leading-relaxed">
                Browse used audio gear from multiple sources. Get alerts on price drops, 
                find rare items, and save money on quality equipment.
              </p>
            </Link>
            
            {/* Smart Recommendations */}
            <Link href="/onboarding" className="card p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30 group" onClick={() => trackEvent({ name: 'feature_clicked', properties: { feature: 'smart_recommendations' } })}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 ring-2 ring-accent/10">
                  <span className="text-lg">🎯</span>
                </div>
                <div>
                  <h3 className="heading-3 font-semibold">Smart Recommendations</h3>
                  <p className="text-accent text-sm font-medium">Get personalized →</p>
                </div>
              </div>
              <p className="text-secondary leading-relaxed">
                Algorithm-driven recommendations based on measurements, your preferences, 
                and existing gear. Science-based, not hype-based.
              </p>
            </Link>
          </div>
        </section>

        {/* Why HiFinder? */}
        <section className="mb-8 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 items-start">
            <div className="card p-6 bg-gradient-to-br from-surface-card to-surface-hover shadow-lg border-2 hover:border-accent/20 transition-colors">
              <h2 className="heading-2 mb-4 bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">Why HiFinder?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0" style={{ marginTop: '2px' }}>
                    <span className="text-accent text-sm font-bold">✓</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Science-Based</h4>
                    <p className="text-secondary text-sm">
                      Recommendations based on measurements and objective data, not marketing hype
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0" style={{ marginTop: '2px' }}>
                    <span className="text-accent text-sm font-bold">✓</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Personalized</h4>
                    <p className="text-secondary text-sm">
                      Considers your experience level, budget, existing gear, and usage patterns
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0" style={{ marginTop: '2px' }}>
                    <span className="text-accent text-sm font-bold">✓</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">No Overwhelm</h4>
                    <p className="text-secondary text-sm">
                      Cut through the noise with curated recommendations that actually fit your needs
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <div className="w-6 h-6 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0" style={{ marginTop: '2px' }}>
                    <span className="text-accent text-sm font-bold">✓</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Always Learning</h4>
                    <p className="text-secondary text-sm">
                      Database updated with new products and measurements continuously
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card p-6" style={{ background: 'linear-gradient(to bottom right, rgba(255, 107, 53, 0.1), rgba(255, 107, 53, 0.05))' }}>
              <h3 className="heading-3 mb-4">Tired of research paralysis?</h3>
              <p className="text-secondary mb-6">
                Stop spending weeks reading conflicting reviews and forum debates. 
                Get personalized recommendations in minutes, not months.
              </p>
              <Link 
                href="/onboarding"
                className="button button-primary w-full"
                onClick={() => trackEvent({ name: 'cta_clicked', properties: { location: 'why_hifinder_section' } })}
              >
                Start Finding Your Setup →
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works - Streamlined */}
        <section id="how-it-works" className="mb-8 py-6">
          <h2 className="heading-2 text-center mb-4 bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">How HiFinder Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
            <div className="card p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30 group">
              <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 ring-2 ring-accent/10">
                <span className="text-lg">📊</span>
              </div>
              <h3 className="heading-3 mb-2 font-semibold">1. Smart Analysis</h3>
              <p className="text-secondary leading-relaxed">
                Advanced algorithms analyze measurements, impedance matching, 
                and synergy between components.
              </p>
            </div>
            <div className="card p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30 group">
              <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 ring-2 ring-accent/10">
                <span className="text-lg">🎧</span>
              </div>
              <h3 className="heading-3 mb-2 font-semibold">2. Build & Track</h3>
              <p className="text-secondary leading-relaxed">
                Create custom stacks, track your collection value, 
                and get alerts on price changes and upgrades.
              </p>
            </div>
            <div className="card p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30 group">
              <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 ring-2 ring-accent/10">
                <span className="text-lg">💰</span>
              </div>
              <h3 className="heading-3 mb-2 font-semibold">3. Find Deals</h3>
              <p className="text-secondary leading-relaxed">
                Access live used market data, get notifications 
                on deals, and optimize your gear budget.
              </p>
            </div>
          </div>
          
          {/* New to Audio - Compact */}
          <div className="text-center mt-8">
            <p className="text-secondary mb-4">New to audio? We have learning resources too.</p>
            <Link href="/learn" className="button button-secondary" onClick={() => trackEvent({ name: 'education_clicked', properties: { location: 'how_it_works_section' } })}>
              📚 Audio Education Center
            </Link>
          </div>
        </section>

        {/* Budget Examples */}
        <section className="mb-8 py-4">
          <h2 className="heading-2 text-center mb-4 bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">Popular Budget Ranges</h2>
          <p className="text-secondary text-center mb-6">Jump straight to recommendations for your budget</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1">
            <Link href="/recommendations?budget=75&source=quick-start" className="card-interactive p-4 text-center hover:scale-105 transition-all duration-300 bg-gradient-to-br from-surface-card to-surface-hover shadow-lg hover:shadow-xl border-2 hover:border-accent/50" onClick={() => trackEvent({ name: 'budget_quick_start_clicked', properties: { budget_tier: 'budget', budget_amount: 75 } })}>
              <div className="bg-gradient-to-r from-accent to-accent-hover rounded-full mx-auto mb-2 shadow-md" style={{ width: '10px', height: '10px' }}></div>
              <h4 className="font-semibold mb-1">Budget</h4>
              <p className="text-xl font-bold mb-1">$20-100</p>
              <p className="text-secondary text-xs mb-2">Great entry point</p>
              <div className="text-accent text-xs font-medium">Quick Start →</div>
            </Link>
            <Link href="/recommendations?budget=250&source=quick-start" className="card-interactive p-4 text-center hover:scale-105 transition-all duration-300 bg-gradient-to-br from-surface-card to-surface-hover shadow-lg hover:shadow-xl border-2 hover:border-accent/50" onClick={() => trackEvent({ name: 'budget_quick_start_clicked', properties: { budget_tier: 'entry', budget_amount: 250 } })}>
              <div className="bg-gradient-to-r from-accent to-accent-hover rounded-full mx-auto mb-2 shadow-md" style={{ width: '10px', height: '10px' }}></div>
              <h4 className="font-semibold mb-1">Entry Level</h4>
              <p className="text-xl font-bold mb-1">$100-400</p>
              <p className="text-secondary text-xs mb-2">Solid performance</p>
              <div className="text-accent text-xs font-medium">Quick Start →</div>
            </Link>
            <Link href="/recommendations?budget=700&source=quick-start" className="card-interactive p-4 text-center hover:scale-105 transition-all duration-300 bg-gradient-to-br from-surface-card to-surface-hover shadow-lg hover:shadow-xl border-2 hover:border-accent/50" onClick={() => trackEvent({ name: 'budget_quick_start_clicked', properties: { budget_tier: 'mid_range', budget_amount: 700 } })}>
              <div className="bg-gradient-to-r from-accent to-accent-hover rounded-full mx-auto mb-2 shadow-md" style={{ width: '10px', height: '10px' }}></div>
              <h4 className="font-semibold mb-1">Mid Range</h4>
              <p className="text-xl font-bold mb-1">$400-1k</p>
              <p className="text-secondary text-xs mb-2">Audiophile quality</p>
              <div className="text-accent text-xs font-medium">Quick Start →</div>
            </Link>
            <Link href="/recommendations?budget=2000&source=quick-start" className="card-interactive p-4 text-center hover:scale-105 transition-all duration-300 bg-gradient-to-br from-surface-card to-surface-hover shadow-lg hover:shadow-xl border-2 hover:border-accent/50" onClick={() => trackEvent({ name: 'budget_quick_start_clicked', properties: { budget_tier: 'high_end', budget_amount: 2000 } })}>
              <div className="bg-gradient-to-r from-accent to-accent-hover rounded-full mx-auto mb-2 shadow-md" style={{ width: '10px', height: '10px' }}></div>
              <h4 className="font-semibold mb-1">High End</h4>
              <p className="text-xl font-bold mb-1">$1k-3k+</p>
              <p className="text-secondary text-xs mb-2">Premium experience</p>
              <div className="text-accent text-xs font-medium">Quick Start →</div>
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center py-4 card mt-6" style={{ background: 'linear-gradient(to right, rgba(255, 107, 53, 0.1), rgba(255, 107, 53, 0.05))' }}>
          <h2 className="heading-2 mb-2">Ready to Find Your Perfect Audio Setup?</h2>
          <p className="text-secondary text-lg mb-4 max-w-2xl mx-auto">
            Skip weeks of research and conflicting reviews. Get science-based recommendations in minutes.
          </p>
          <Link 
            href="/onboarding"
            className="button button-primary button-lg"
            onClick={() => trackEvent({ name: 'final_cta_clicked', properties: { location: 'bottom_cta' } })}
          >
            Start Your Audio Journey →
          </Link>
          <p className="text-secondary text-sm mt-3">Takes less than 5 minutes • Completely free • No signup required</p>
        </section>

      </div>
    </main>
  )
}