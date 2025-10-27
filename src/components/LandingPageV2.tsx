'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { Check, Package, Construction, ShoppingCart, Target } from 'lucide-react'

interface SiteStats {
  components: number
  listings: number
  budgetRange: {
    min: number
    max: number
  }
}

export function LandingPageV2() {
  const [stats, setStats] = useState<SiteStats>({
    components: 579,
    listings: 316,
    budgetRange: { min: 20, max: 10000 }
  })

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {
        // Keep fallback values
      })
  }, [])

  return (
    <main className="min-h-screen">
      {/* Hero Section - Lovable Style */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/10 opacity-5"></div>

        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column: Content */}
            <div className="space-y-8">
              {/* Top Badge */}
              <div className="inline-block">
                <span className="text-sm font-semibold text-accent uppercase tracking-wide">
                  Your Audio Gear Guide
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Find Your Perfect
                <span className="text-accent"> Headphones</span>
              </h1>

              {/* Description */}
              <p className="text-xl text-secondary leading-relaxed">
                Build, track, and optimize your audio gear collection with personalized recommendations,
                stack management, and used market integration
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/recommendations"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl group"
                  onClick={() => trackEvent({ name: 'hero_cta_clicked', properties: { location: 'hero_primary' } })}
                >
                  🎯 Find My Perfect Setup
                  <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                </Link>
                <Link
                  href="/learn"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border hover:bg-surface-secondary text-foreground font-semibold rounded-lg transition-colors"
                  onClick={() => trackEvent({ name: 'learn_clicked', properties: { location: 'hero_secondary' } })}
                >
                  📚 Learn Audio Basics
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-accent" />
                  <span className="text-sm">Free forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-accent" />
                  <span className="text-sm">No signup required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-accent" />
                  <span className="text-sm">5-minute setup</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Image */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-accent/5 rounded-3xl blur-3xl opacity-20"></div>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/images/hero-headphones.jpg"
                  alt="Premium headphones"
                  width={600}
                  height={400}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-16 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center space-y-2 group cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-accent transition-transform group-hover:scale-110">
                {stats.components}+
              </div>
              <div className="text-sm text-secondary">Components</div>
            </div>
            <div className="text-center space-y-2 group cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-accent transition-transform group-hover:scale-110">
                $20-10k
              </div>
              <div className="text-sm text-secondary">Budget Range</div>
            </div>
            <div className="text-center space-y-2 group cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-accent transition-transform group-hover:scale-110">
                {stats.listings}+
              </div>
              <div className="text-sm text-secondary">Used Listings</div>
            </div>
            <div className="text-center space-y-2 group cursor-default">
              <div className="text-3xl md:text-4xl font-bold text-accent transition-transform group-hover:scale-110">
                Smart
              </div>
              <div className="text-sm text-secondary">Tracking</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-surface-secondary/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-bold">Complete Audio Gear Management</h2>
            <p className="text-secondary text-lg max-w-2xl mx-auto">
              Everything you need to build, manage, and optimize your perfect audio setup
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature Cards */}
            {[
              {
                icon: <Package className="h-6 w-6" />,
                title: "Gear Collection",
                description: "Track your audio gear, monitor values, set up price alerts, and discover upgrade paths. Keep detailed records of your entire setup.",
                link: "/gear",
                linkText: "Track & manage →"
              },
              {
                icon: <Construction className="h-6 w-6" />,
                title: "Stack Builder",
                description: "Build and compare complete audio systems. Test different combinations, calculate total costs, and find the perfect synergy.",
                link: "/gear?tab=stacks",
                linkText: "Create systems →"
              },
              {
                icon: <ShoppingCart className="h-6 w-6" />,
                title: "Used Market",
                description: "Browse used audio gear from multiple sources. Get alerts on price drops, find rare items, and save money on quality equipment.",
                link: "/used-market",
                linkText: "Find deals →"
              },
              {
                icon: <Target className="h-6 w-6" />,
                title: "Smart Recommendations",
                description: "Algorithm-driven recommendations based on measurements, your preferences, and existing gear. Science-based, not hype-based.",
                link: "/recommendations",
                linkText: "Get personalized →"
              }
            ].map((feature, index) => (
              <Link
                key={index}
                href={feature.link}
                className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group bg-card border border-border rounded-lg"
                onClick={() => trackEvent({ name: 'feature_clicked', properties: { feature: feature.title.toLowerCase().replace(' ', '_') } })}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-lg bg-accent/50 text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                      {feature.icon}
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold">{feature.title}</h3>

                  <p className="text-secondary leading-relaxed">
                    {feature.description}
                  </p>

                  <div className="pt-2">
                    <span className="text-accent font-medium group-hover:underline">
                      {feature.linkText}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-bold">Why HiFinder?</h2>
            <p className="text-secondary text-lg max-w-2xl mx-auto">
              The smartest way to navigate the audio gear market
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                title: "Science-Based",
                description: "Recommendations based on measurements and objective data, not marketing hype"
              },
              {
                title: "Save Money",
                description: "Find the best deals on used gear and avoid overpaying for new equipment"
              },
              {
                title: "Build Better",
                description: "Create synergistic systems where components complement each other perfectly"
              },
              {
                title: "Track Everything",
                description: "Monitor your collection's value, set alerts, and never miss a good deal"
              }
            ].map((benefit, index) => (
              <div key={index} className="flex gap-4 group">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent transition-colors">
                    <Check className="h-5 w-5 text-accent group-hover:text-white transition-colors" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">{benefit.title}</h3>
                  <p className="text-secondary leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/10 opacity-5"></div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Find Your Perfect Audio Setup?
            </h2>

            <p className="text-xl text-secondary">
              Join thousands of audio enthusiasts who trust HiFinder to build their ideal systems
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href="/recommendations"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-white text-lg font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                onClick={() => trackEvent({ name: 'final_cta_clicked', properties: { location: 'bottom_cta' } })}
              >
                🎯 Get Started Free
              </Link>
              <Link
                href="/learn"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-border hover:bg-surface-secondary text-foreground text-lg font-semibold rounded-lg transition-colors"
              >
                View Demo
              </Link>
            </div>

            <p className="text-sm text-secondary">
              No credit card required • Free forever • Setup in 5 minutes
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
