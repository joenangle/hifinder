'use client'

import Link from 'next/link'

export default function AboutPage() {
  return (
    <main className="page-container">
      <div className="max-w-4xl w-full">
        
        {/* Hero Section */}
        <section className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-accent to-accent-hover rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg border border-accent/20">
            <span className="text-3xl">🎧</span>
          </div>
          <h1 className="heading-1 mb-4">About HiFinder</h1>
          <p className="text-lg text-secondary max-w-2xl mx-auto">
            Your personal audio gear companion, helping you discover the perfect headphones, DACs, and amplifiers for your listening preferences and budget.
          </p>
        </section>

        {/* Mission Section */}
        <section className="mb-12">
          <div className="card p-8 bg-gradient-to-br from-surface-card to-surface-hover">
            <h2 className="heading-2 mb-4 text-center">Our Mission</h2>
            <p className="text-lg text-secondary text-center mb-6">
              Finding the right audio gear shouldn&apos;t be overwhelming. We simplify the discovery process with personalized recommendations based on your preferences, budget, and listening habits.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center mx-auto mb-1">
                  <span className="text-3xl">🎯</span>
                </div>
                <h3 className="font-semibold mb-2">Personalized</h3>
                <p className="text-sm text-secondary">Recommendations tailored to your unique preferences and budget</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center mx-auto mb-1">
                  <span className="text-3xl">🔍</span>
                </div>
                <h3 className="font-semibold mb-2">Comprehensive</h3>
                <p className="text-sm text-secondary">Extensive database of headphones, DACs, and amplifiers</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center mx-auto mb-1">
                  <span className="text-3xl">💡</span>
                </div>
                <h3 className="font-semibold mb-2">Educational</h3>
                <p className="text-sm text-secondary">Learn about audio gear and make informed decisions</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-12">
          <h2 className="heading-2 mb-6 text-center">What We Offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/onboarding" className="card p-6 hover:shadow-lg transition-all duration-300 block">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/30 rounded-lg flex items-center justify-center">
                  <span className="text-3xl">🎵</span>
                </div>
                <h3 className="heading-3">Smart Recommendations</h3>
              </div>
              <p className="text-secondary">
                Get personalized gear suggestions based on your budget, preferences, existing gear, and listening habits.
              </p>
            </Link>
            
            <div className="card p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/30 rounded-lg flex items-center justify-center">
                  <span className="text-3xl">🏗️</span>
                </div>
                <h3 className="heading-3">System Builder</h3>
              </div>
              <p className="text-secondary">
                Create and compare complete audio systems with compatible components that work well together.
              </p>
            </div>
            
            <Link href="/gear" className="card p-6 hover:shadow-lg transition-all duration-300 block">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/30 rounded-lg flex items-center justify-center">
                  <span className="text-3xl">📊</span>
                </div>
                <h3 className="heading-3">Gear Management</h3>
              </div>
              <p className="text-secondary">
                Track your current collection, monitor values, and get upgrade recommendations.
              </p>
            </Link>
            
            <Link href="/used-market" className="card p-6 hover:shadow-lg transition-all duration-300 block">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/30 rounded-lg flex items-center justify-center">
                  <span className="text-3xl">🛒</span>
                </div>
                <h3 className="heading-3">Market Intelligence</h3>
              </div>
              <p className="text-secondary">
                Find great deals on used gear and get alerts when prices drop on items you&apos;re watching.
              </p>
            </Link>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="mb-12">
          <div className="card p-8 bg-gradient-to-br from-surface-card to-surface-hover">
            <h2 className="heading-2 mb-6 text-center">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface/50 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="font-semibold mb-3">Share Your Preferences</h3>
                <p className="text-secondary text-sm">Tell us about your budget, listening habits, and what kind of sound you enjoy.</p>
              </div>
              
              <div className="bg-surface/50 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="font-semibold mb-3">Get Personalized Matches</h3>
                <p className="text-secondary text-sm">Our algorithm finds gear that matches your preferences and works well together.</p>
              </div>
              
              <div className="bg-surface/50 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="font-semibold mb-3">Make Informed Decisions</h3>
                <p className="text-secondary text-sm">Compare options, read detailed explanations, and choose what&apos;s right for you.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center mb-8">
          <div className="card p-8 bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20">
            <h2 className="heading-2 mb-4">Ready to Find Your Perfect Audio Setup?</h2>
            <p className="text-secondary mb-6">
              Start your journey with our quick start guide or dive deep into personalized recommendations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/quick-start"
                className="button button-primary"
              >
                Quick Start Guide
              </Link>
              <Link 
                href="/onboarding"
                className="button button-secondary"
              >
                Get Full Recommendations
              </Link>
            </div>
          </div>
        </section>

      </div>
    </main>
  )
}