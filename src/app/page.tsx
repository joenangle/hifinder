import Link from 'next/link'

export default function Home() {
  return (
    <main className="page-container">
      <div className="max-w-6xl w-full">
        
        {/* Hero Section with Prominent CTA */}
        <section className="text-center mb-12 mt-8 animate-slideUp">
          <h1 className="heading-1 mb-4">HiFinder</h1>
          <p className="text-secondary text-xl mb-8 max-w-2xl mx-auto">
            Find your perfect headphone setup in minutes with personalized recommendations 
            based on your budget, preferences, and existing gear
          </p>
          
          {/* Primary CTA - Very Prominent */}
          <div className="mb-8">
            <Link 
              href="/onboarding"
              className="button button-primary button-lg inline-flex items-center gap-3"
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
        </section>

        {/* Quick Stats */}
        <section className="mb-12 py-4 animate-fadeIn">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="card text-center p-4">
              <div className="text-3xl font-bold text-accent mb-2">1,200+</div>
              <div className="text-secondary text-sm">Components</div>
            </div>
            <div className="card text-center p-4">
              <div className="text-3xl font-bold text-accent mb-2">$20-10k</div>
              <div className="text-secondary text-sm">Budget Range</div>
            </div>
            <div className="card text-center p-4">
              <div className="text-3xl font-bold text-accent mb-2">5 Mins</div>
              <div className="text-secondary text-sm">Setup Time</div>
            </div>
            <div className="card text-center p-4">
              <div className="text-3xl font-bold text-accent mb-2">Science</div>
              <div className="text-secondary text-sm">Based</div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="mb-12 py-8">
          <h2 className="heading-2 text-center mb-6">How HiFinder Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="heading-3 mb-4">1. Tell Us About You</h3>
              <p className="text-secondary">
                Share your experience level, budget, existing gear, and preferences. 
                Takes just 2-3 minutes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="heading-3 mb-4">2. Smart Matching</h3>
              <p className="text-secondary">
                Our algorithm considers measurements, reviews, and compatibility 
                to find your ideal components.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🎧</span>
              </div>
              <h3 className="heading-3 mb-4">3. Get Recommendations</h3>
              <p className="text-secondary">
                Receive personalized recommendations with explanations, 
                purchase links, and setup guidance.
              </p>
            </div>
          </div>
        </section>

        {/* Why HiFinder? */}
        <section className="mb-12 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="heading-2 mb-4">Why HiFinder?</h2>
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0" style={{ marginTop: '2px' }}>
                    <span className="text-accent text-sm font-bold">✓</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Science-Based</h4>
                    <p className="text-secondary text-sm">
                      Recommendations based on measurements and objective data, not marketing hype
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0" style={{ marginTop: '2px' }}>
                    <span className="text-accent text-sm font-bold">✓</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Personalized</h4>
                    <p className="text-secondary text-sm">
                      Considers your experience level, budget, existing gear, and usage patterns
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0" style={{ marginTop: '2px' }}>
                    <span className="text-accent text-sm font-bold">✓</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">No Overwhelm</h4>
                    <p className="text-secondary text-sm">
                      Cut through the noise with curated recommendations that actually fit your needs
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0" style={{ marginTop: '2px' }}>
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
        <section className="mb-12 py-6">
          <h2 className="heading-2 text-center mb-6">New to Audio? We&apos;ve Got You Covered</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-4">
              <div className="text-2xl mb-4">📊</div>
              <h3 className="font-semibold mb-3">Understanding Measurements</h3>
              <p className="text-secondary text-sm mb-4">
                Learn to read frequency response graphs and what they mean for sound quality
              </p>
              <Link href="/learn#measurements" className="text-accent text-sm font-medium">
                Learn More →
              </Link>
            </div>
            <div className="card p-4">
              <div className="text-2xl mb-4">⚡</div>
              <h3 className="font-semibold mb-3">Do You Need an Amp?</h3>
              <p className="text-secondary text-sm mb-4">
                Understand when amplification is necessary and when it&apos;s just nice to have
              </p>
              <Link href="/learn#amplification" className="text-accent text-sm font-medium">
                Learn More →
              </Link>
            </div>
            <div className="card p-4">
              <div className="text-2xl mb-4">🎯</div>
              <h3 className="font-semibold mb-3">Sound Signatures</h3>
              <p className="text-secondary text-sm mb-4">
                Discover what neutral, warm, bright, and V-shaped actually mean
              </p>
              <Link href="/learn#sound-signatures" className="text-accent text-sm font-medium">
                Learn More →
              </Link>
            </div>
          </div>
          <div className="text-center mt-8">
            <Link 
              href="/learn"
              className="button button-secondary"
            >
              Explore All Learning Resources
            </Link>
          </div>
        </section>

        {/* Budget Examples */}
        <section className="mb-12 py-6">
          <h2 className="heading-2 text-center mb-6">Popular Budget Ranges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-3 text-center">
              <div className="bg-accent rounded mx-auto mb-3" style={{ width: '12px', height: '12px' }}></div>
              <h4 className="font-semibold mb-2">Budget</h4>
              <p className="text-2xl font-bold mb-2">$20-100</p>
              <p className="text-secondary text-xs">Great entry point</p>
            </div>
            <div className="card p-3 text-center">
              <div className="bg-accent rounded mx-auto mb-3" style={{ width: '12px', height: '12px' }}></div>
              <h4 className="font-semibold mb-2">Entry Level</h4>
              <p className="text-2xl font-bold mb-2">$100-400</p>
              <p className="text-secondary text-xs">Solid performance</p>
            </div>
            <div className="card p-3 text-center">
              <div className="bg-accent rounded mx-auto mb-3" style={{ width: '12px', height: '12px' }}></div>
              <h4 className="font-semibold mb-2">Mid Range</h4>
              <p className="text-2xl font-bold mb-2">$400-1k</p>
              <p className="text-secondary text-xs">Audiophile quality</p>
            </div>
            <div className="card p-3 text-center">
              <div className="bg-accent rounded mx-auto mb-3" style={{ width: '12px', height: '12px' }}></div>
              <h4 className="font-semibold mb-2">High End</h4>
              <p className="text-2xl font-bold mb-2">$1k-3k+</p>
              <p className="text-secondary text-xs">Premium experience</p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center py-6 card mt-8" style={{ background: 'linear-gradient(to right, rgba(255, 107, 53, 0.1), rgba(255, 107, 53, 0.05))' }}>
          <h2 className="heading-2 mb-3">Ready to Find Your Perfect Audio Setup?</h2>
          <p className="text-secondary text-lg mb-6 max-w-2xl mx-auto">
            Join thousands who&apos;ve discovered their ideal headphone setup without the research overwhelm
          </p>
          <Link 
            href="/onboarding"
            className="button button-primary button-lg"
          >
            Start Your Audio Journey →
          </Link>
          <p className="text-secondary text-sm mt-4">Takes less than 5 minutes • Completely free</p>
        </section>

      </div>
    </main>
  )
}