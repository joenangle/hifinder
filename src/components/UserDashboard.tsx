'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { trackEvent } from '@/lib/analytics'

export function UserDashboard() {
  const { data: session } = useSession()
  
  const firstName = session?.user?.name?.split(' ')[0] || 'there'

  return (
    <main className="page-container">
      <div className="max-w-4xl w-full">
        
        {/* Welcome Section */}
        <section className="text-center mb-8 mt-6">
          <h1 className="heading-1 mb-2">Welcome back, {firstName}!</h1>
          <p className="text-secondary text-lg mb-6">
            Ready to find your next audio upgrade or build a new system?
          </p>
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="heading-2 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/onboarding"
              className="card p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30 group"
              onClick={() => trackEvent({ name: 'dashboard_action_clicked', properties: { action: 'get_recommendations' } })}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-xl">🎯</span>
                </div>
                <div>
                  <h3 className="heading-3 font-semibold mb-1">Get Recommendations</h3>
                  <p className="text-accent text-sm font-medium">Find gear →</p>
                </div>
              </div>
              <p className="text-secondary text-sm">
                Get personalized recommendations based on your preferences and budget
              </p>
            </Link>
            
            <Link 
              href="/gear?tab=stacks"
              className="card p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30 group"
              onClick={() => trackEvent({ name: 'dashboard_action_clicked', properties: { action: 'build_stack' } })}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-xl">🏗️</span>
                </div>
                <div>
                  <h3 className="heading-3 font-semibold mb-1">Build a Stack</h3>
                  <p className="text-accent text-sm font-medium">Create system →</p>
                </div>
              </div>
              <p className="text-secondary text-sm">
                Design complete audio systems and compare different combinations
              </p>
            </Link>
            
            <Link 
              href="/used-market"
              className="card p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-surface-card to-surface-card/50 border-2 hover:border-accent/30 group"
              onClick={() => trackEvent({ name: 'dashboard_action_clicked', properties: { action: 'browse_market' } })}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-accent/20 to-accent/30 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <span className="text-xl">🛒</span>
                </div>
                <div>
                  <h3 className="heading-3 font-semibold mb-1">Browse Used Market</h3>
                  <p className="text-accent text-sm font-medium">Find deals →</p>
                </div>
              </div>
              <p className="text-secondary text-sm">
                Discover great deals on quality used audio equipment
              </p>
            </Link>
          </div>
        </section>

        {/* Your Gear Overview */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading-2">Your Gear</h2>
            <Link 
              href="/gear" 
              className="text-accent hover:text-accent-hover text-sm font-medium"
              onClick={() => trackEvent({ name: 'dashboard_link_clicked', properties: { link: 'view_all_gear' } })}
            >
              View All →
            </Link>
          </div>
          <div className="card p-6 bg-gradient-to-br from-surface-card to-surface-hover">
            <p className="text-secondary mb-4">
              Track your audio collection, monitor values, and get upgrade recommendations.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-surface/50 rounded-lg">
                <div className="text-2xl font-bold text-accent mb-1">0</div>
                <div className="text-sm text-secondary">Components</div>
              </div>
              <div className="text-center p-4 bg-surface/50 rounded-lg">
                <div className="text-2xl font-bold text-accent mb-1">$0</div>
                <div className="text-sm text-secondary">Total Value</div>
              </div>
              <div className="text-center p-4 bg-surface/50 rounded-lg">
                <div className="text-2xl font-bold text-accent mb-1">0</div>
                <div className="text-sm text-secondary">Stacks</div>
              </div>
            </div>
            <div className="text-center mt-4">
              <Link 
                href="/gear"
                className="button button-primary"
                onClick={() => trackEvent({ name: 'dashboard_action_clicked', properties: { action: 'add_gear' } })}
              >
                Add Your First Component
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Budget Selection */}
        <section className="mb-8">
          <h2 className="heading-2 mb-4">Find Gear by Budget</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link 
              href="/quick-start?budget=75"
              className="card-interactive p-4 text-center hover:scale-105 transition-all duration-300 bg-gradient-to-br from-surface-card to-surface-hover"
              onClick={() => trackEvent({ name: 'dashboard_budget_clicked', properties: { budget: 75 } })}
            >
              <div className="text-lg mb-2">💰</div>
              <h4 className="font-semibold mb-1">Budget</h4>
              <p className="text-sm font-bold mb-1">$20-100</p>
              <div className="text-accent text-xs font-medium">Quick Start →</div>
            </Link>
            <Link 
              href="/quick-start?budget=250"
              className="card-interactive p-4 text-center hover:scale-105 transition-all duration-300 bg-gradient-to-br from-surface-card to-surface-hover"
              onClick={() => trackEvent({ name: 'dashboard_budget_clicked', properties: { budget: 250 } })}
            >
              <div className="text-lg mb-2">🎧</div>
              <h4 className="font-semibold mb-1">Entry Level</h4>
              <p className="text-sm font-bold mb-1">$100-400</p>
              <div className="text-accent text-xs font-medium">Quick Start →</div>
            </Link>
            <Link 
              href="/quick-start?budget=700"
              className="card-interactive p-4 text-center hover:scale-105 transition-all duration-300 bg-gradient-to-br from-surface-card to-surface-hover"
              onClick={() => trackEvent({ name: 'dashboard_budget_clicked', properties: { budget: 700 } })}
            >
              <div className="text-lg mb-2">🔊</div>
              <h4 className="font-semibold mb-1">Mid Range</h4>
              <p className="text-sm font-bold mb-1">$400-1k</p>
              <div className="text-accent text-xs font-medium">Quick Start →</div>
            </Link>
            <Link 
              href="/quick-start?budget=2000"
              className="card-interactive p-4 text-center hover:scale-105 transition-all duration-300 bg-gradient-to-br from-surface-card to-surface-hover"
              onClick={() => trackEvent({ name: 'dashboard_budget_clicked', properties: { budget: 2000 } })}
            >
              <div className="text-lg mb-2">✨</div>
              <h4 className="font-semibold mb-1">High End</h4>
              <p className="text-sm font-bold mb-1">$1k-3k+</p>
              <div className="text-accent text-xs font-medium">Quick Start →</div>
            </Link>
          </div>
        </section>

        {/* Secondary Actions */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link 
              href="/wishlist"
              className="card p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              onClick={() => trackEvent({ name: 'dashboard_action_clicked', properties: { action: 'view_wishlist' } })}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/30 rounded-lg flex items-center justify-center">
                  <span className="text-sm">❤️</span>
                </div>
                <div>
                  <h3 className="font-semibold">My Wishlist</h3>
                  <p className="text-xs text-secondary">0 items</p>
                </div>
              </div>
              <p className="text-sm text-secondary">
                Items you&apos;re watching and considering for future purchases
              </p>
            </Link>
            
            <Link 
              href="/alerts"
              className="card p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              onClick={() => trackEvent({ name: 'dashboard_action_clicked', properties: { action: 'view_alerts' } })}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/30 rounded-lg flex items-center justify-center">
                  <span className="text-sm">🔔</span>
                </div>
                <div>
                  <h3 className="font-semibold">Price Alerts</h3>
                  <p className="text-xs text-secondary">No active alerts</p>
                </div>
              </div>
              <p className="text-sm text-secondary">
                Get notified when prices drop on items you&apos;re interested in
              </p>
            </Link>
          </div>
        </section>

      </div>
    </main>
  )
}