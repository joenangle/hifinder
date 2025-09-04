import Link from 'next/link'

export default function Home() {
  return (
    <main className="page-container relative">
      {/* Subtle background pattern */}
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
            <h1 className="heading-1 bg-gradient-to-r from-foreground via-foreground to-accent bg-clip-text text-transparent">
              HiFinder
            </h1>
          </div>
          
          {/* Tagline */}
          <p className="text-accent font-semibold text-sm mb-4 tracking-wide uppercase">
            Your Audio Gear Guide
          </p>
          
          {/* Main Description */}
          <p className="text-secondary text-xl mb-6 max-w-2xl mx-auto leading-relaxed">
            Find your perfect headphone setup in minutes with personalized recommendations 
            based on your budget, preferences, and existing gear
          </p>
          
          {/* Primary CTA - Very Prominent */}
          <div className="mb-6">
            <Link 
              href="/onboarding"
              className="button button-primary button-lg inline-flex items-center gap-3 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-accent to-accent-hover hover:from-accent-hover hover:to-accent border-2 border-accent/20"
            >
              🎯 Find My Perfect Setup
            </Link>
          </div>
          
          {/* Secondary Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/learn"
              className="button button-secondary"
            >
              📚 Learn Audio Basics
            </Link>
            <Link 
              href="#how-it-works"
              className="button button-secondary"
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
              <div className="text-3xl font-bold text-accent mb-2">5 Mins</div>
              <div className="text-foreground text-sm font-semibold">Setup Time</div>
            </div>
            <div className="card text-center p-4 bg-gradient-to-br from-surface-card to-surface-hover border-2 hover:border-accent/30 transition-all duration-300 hover:scale-105">
              <div className="text-3xl font-bold text-accent mb-2">Science</div>
              <div className="text-foreground text-sm font-semibold">Based</div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="mb-8 py-6">
          <h2 className="heading-2 text-center mb-4 bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">How HiFinder Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            <div className="card p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30 group">
              <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 ring-2 ring-accent/10">
                <span className="text-lg">📋</span>
              </div>
              <h3 className="heading-3 mb-2 font-semibold">1. Tell Us About You</h3>
              <p className="text-secondary leading-relaxed">
                Share your experience level, budget, existing gear, and preferences. 
                Takes just 2-3 minutes.
              </p>
            </div>
            <div className="card p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30 group">
              <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 ring-2 ring-accent/10">
                <span className="text-lg">🧠</span>
              </div>
              <h3 className="heading-3 mb-2 font-semibold">2. Smart Matching</h3>
              <p className="text-secondary leading-relaxed">
                Our algorithm considers measurements, reviews, and compatibility 
                to find your ideal components.
              </p>
            </div>
            <div className="card p-6 text-center hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30 group">
              <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 ring-2 ring-accent/10">
                <span className="text-lg">🎧</span>
              </div>
              <h3 className="heading-3 mb-2 font-semibold">3. Get Recommendations</h3>
              <p className="text-secondary leading-relaxed">
                Receive personalized recommendations with explanations, 
                purchase links, and setup guidance.
              </p>
            </div>
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
              >
                Start Finding Your Setup →
              </Link>
            </div>
          </div>
        </section>

        {/* Audio Education Preview */}
        <section className="mb-8 py-4">
          <h2 className="heading-2 text-center mb-4 bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">New to Audio? We&apos;ve Got You Covered</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
            <div className="card p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30">
              <div className="text-xl mb-2 bg-gradient-to-br from-accent/20 to-accent/30 w-8 h-8 rounded-lg flex items-center justify-center">📊</div>
              <h3 className="font-semibold mb-2">Understanding Measurements</h3>
              <p className="text-secondary text-sm mb-3">
                Learn to read frequency response graphs and what they mean for sound quality
              </p>
              <Link href="/learn#measurements" className="text-accent text-sm font-medium">
                Learn More →
              </Link>
            </div>
            <div className="card p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30">
              <div className="text-xl mb-2 bg-gradient-to-br from-accent/20 to-accent/30 w-8 h-8 rounded-lg flex items-center justify-center">⚡</div>
              <h3 className="font-semibold mb-2">Do You Need an Amp?</h3>
              <p className="text-secondary text-sm mb-3">
                Understand when amplification is necessary and when it&apos;s just nice to have
              </p>
              <Link href="/learn#amplification" className="text-accent text-sm font-medium">
                Learn More →
              </Link>
            </div>
            <div className="card p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30">
              <div className="text-xl mb-2 bg-gradient-to-br from-accent/20 to-accent/30 w-8 h-8 rounded-lg flex items-center justify-center">🎯</div>
              <h3 className="font-semibold mb-2">Sound Signatures</h3>
              <p className="text-secondary text-sm mb-3">
                Discover what neutral, warm, bright, and V-shaped actually mean
              </p>
              <Link href="/learn#sound-signatures" className="text-accent text-sm font-medium">
                Learn More →
              </Link>
            </div>
          </div>
          <div className="text-center mt-6">
            <Link 
              href="/learn"
              className="button button-secondary"
            >
              Explore All Learning Resources
            </Link>
          </div>
        </section>

        {/* Budget Examples */}
        <section className="mb-8 py-4">
          <h2 className="heading-2 text-center mb-4 bg-gradient-to-r from-foreground to-accent bg-clip-text text-transparent">Popular Budget Ranges</h2>
          <p className="text-secondary text-center mb-6">Jump straight to recommendations for your budget</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
            <Link href="/quick-start?budget=75" className="card-interactive p-4 text-center hover:scale-105 transition-all duration-300 bg-gradient-to-br from-surface-card to-surface-hover shadow-lg hover:shadow-xl border-2 hover:border-accent/50">
              <div className="bg-gradient-to-r from-accent to-accent-hover rounded-full mx-auto mb-2 shadow-md" style={{ width: '10px', height: '10px' }}></div>
              <h4 className="font-semibold mb-1">Budget</h4>
              <p className="text-xl font-bold mb-1">$20-100</p>
              <p className="text-secondary text-xs mb-2">Great entry point</p>
              <div className="text-accent text-xs font-medium">Quick Start →</div>
            </Link>
            <Link href="/quick-start?budget=250" className="card-interactive p-4 text-center hover:scale-105 transition-all duration-300 bg-gradient-to-br from-surface-card to-surface-hover shadow-lg hover:shadow-xl border-2 hover:border-accent/50">
              <div className="bg-gradient-to-r from-accent to-accent-hover rounded-full mx-auto mb-2 shadow-md" style={{ width: '10px', height: '10px' }}></div>
              <h4 className="font-semibold mb-1">Entry Level</h4>
              <p className="text-xl font-bold mb-1">$100-400</p>
              <p className="text-secondary text-xs mb-2">Solid performance</p>
              <div className="text-accent text-xs font-medium">Quick Start →</div>
            </Link>
            <Link href="/quick-start?budget=700" className="card-interactive p-4 text-center hover:scale-105 transition-all duration-300 bg-gradient-to-br from-surface-card to-surface-hover shadow-lg hover:shadow-xl border-2 hover:border-accent/50">
              <div className="bg-gradient-to-r from-accent to-accent-hover rounded-full mx-auto mb-2 shadow-md" style={{ width: '10px', height: '10px' }}></div>
              <h4 className="font-semibold mb-1">Mid Range</h4>
              <p className="text-xl font-bold mb-1">$400-1k</p>
              <p className="text-secondary text-xs mb-2">Audiophile quality</p>
              <div className="text-accent text-xs font-medium">Quick Start →</div>
            </Link>
            <Link href="/quick-start?budget=2000" className="card-interactive p-4 text-center hover:scale-105 transition-all duration-300 bg-gradient-to-br from-surface-card to-surface-hover shadow-lg hover:shadow-xl border-2 hover:border-accent/50">
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
            Join thousands who&apos;ve discovered their ideal headphone setup without the research overwhelm
          </p>
          <Link 
            href="/onboarding"
            className="button button-primary button-lg"
          >
            Start Your Audio Journey →
          </Link>
          <p className="text-secondary text-sm mt-3">Takes less than 5 minutes • Completely free</p>
        </section>

      </div>
    </main>
  )
}