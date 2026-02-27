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

        {/* The Learning Journey */}
        <section className="mb-12">
          <div className="card p-8">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-4xl">🚀</span>
              <div>
                <h2 className="heading-2 mb-4">The Learning Journey</h2>
                <div className="space-y-4 text-secondary">
                  <p>
                    HiFinder started as a personal experiment in &ldquo;<strong className="text-primary">vibecoding</strong>&rdquo; —
                    building something real, fast, and iterative to see what&apos;s possible in just a few weeks.
                    As someone learning to code with AI assistance, I wanted to test the boundaries of rapid development
                    while solving a problem I actually care about.
                  </p>
                  <p>
                    The audio community has always been overwhelmingly helpful to beginners, but the sheer volume of
                    options can be paralyzing. I built HiFinder to be the tool I wish I had when starting out —
                    cutting through the noise to help people find gear that matches their needs and budget.
                  </p>
                </div>
              </div>
            </div>
          </div>
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

        {/* The Environmental Mission */}
        <section className="mb-12">
          <div className="card p-8">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-4xl">🌱</span>
              <div>
                <h2 className="heading-2 mb-4">The Environmental Mission</h2>
                <div className="space-y-4 text-secondary">
                  <p>
                    Audio gear doesn&apos;t need to be disposable. A well-made pair of headphones or a quality DAC/amp
                    can last decades with proper care. Yet the industry thrives on the constant churn of new releases,
                    and perfectly good equipment ends up as e-waste.
                  </p>
                  <p>
                    <strong className="text-primary">My hope is that by making used equipment more discoverable and trustworthy</strong>,
                    HiFinder can help reduce the environmental impact of a hobby I love and share with countless other
                    listeners and audio enthusiasts.
                  </p>
                  <p className="text-sm border-l-4 border-accent pl-4 italic">
                    &ldquo;Buying one used headphone instead of new saves about 14kg of CO₂ — barely a dent in your annual footprint. But if enough of us make it normal, manufacturers will have to build gear <a href="https://medium.com/@joenangle/the-life-deaths-of-a-toothbrush-da5e8b1cd408" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-semibold">that lasts</a>. That&apos;s when real change happens.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-12">
          <h2 className="heading-2 mb-6 text-center">What We Offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/recommendations" className="card p-6 hover:shadow-lg transition-[border-color,box-shadow] duration-300 block">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-accent/20 to-accent/30 rounded-lg flex items-center justify-center">
                  <span className="text-3xl">👂</span>
                </div>
                <h3 className="heading-3">Smart Recommendations</h3>
              </div>
              <p className="text-secondary">
                Get personalized gear suggestions based on your budget, preferences, existing gear, and listening habits.
              </p>
            </Link>

            <div className="card p-6 hover:shadow-lg transition-[border-color,box-shadow] duration-300">
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

            <Link href="/gear" className="card p-6 hover:shadow-lg transition-[border-color,box-shadow] duration-300 block">
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

            <Link href="/marketplace" className="card p-6 hover:shadow-lg transition-[border-color,box-shadow] duration-300 block">
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

        {/* The Bigger Picture */}
        <section className="mb-12">
          <div className="card p-8 bg-accent/5 border-accent/20">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-4xl">💡</span>
              <div>
                <h2 className="heading-2 mb-4">The Bigger Picture</h2>
                <div className="space-y-4 text-secondary">
                  <p>
                    If HiFinder can help even a handful of people choose used over new — or choose the right gear
                    the first time instead of churning through multiple purchases — it will have succeeded.
                  </p>
                  <p>
                    Every headphone that finds a second owner is one less unit in a landfill. Every DAC that serves
                    a new listener is one less manufactured device. Small choices, multiplied across a community,
                    can make a real difference.
                  </p>
                  <p>
                    <strong className="text-primary">
                      This is a passion project built by one person learning to code, but it represents a belief
                      that we can enjoy our hobbies while being more mindful of their impact.
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Community & Open Source */}
        <section className="mb-12">
          <div className="card p-8">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-4xl">🤝</span>
              <div>
                <h2 className="heading-2 mb-4">Join the Mission</h2>
                <div className="space-y-4 text-secondary">
                  <p>
                    HiFinder is a work in progress, and I&apos;m always looking to improve it. If you have ideas,
                    feedback, or want to contribute, I&apos;d love to hear from you.
                  </p>
                  <div className="flex flex-wrap gap-4 mt-6">
                    <a
                      href="https://github.com/joenangle/hifinder"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button-secondary inline-flex items-center gap-2"
                    >
                      <span>⭐</span>
                      <span>Star on GitHub</span>
                    </a>
                    <a
                      href="mailto:hello@hifinder.app"
                      className="button button-secondary inline-flex items-center gap-2"
                    >
                      <span>✉️</span>
                      <span>Get in Touch</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center mb-8">
          <div className="card p-8 bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20">
            <h2 className="heading-2 mb-4">Ready to Find Your Perfect Audio Setup?</h2>
            <p className="text-secondary mb-6">
              Choose from quick budget-based recommendations or get a fully personalized experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="button button-primary"
              >
                Quick Recommendations
              </Link>
              <Link
                href="/recommendations"
                className="button button-secondary"
              >
                Browse Recommendations
              </Link>
            </div>
          </div>
        </section>

        {/* Credits */}
        <section className="text-center py-8 border-t border-border">
          <p className="text-sm text-tertiary mb-2">
            Built with Next.js, Supabase, and lots of coffee
          </p>
          <p className="text-sm text-tertiary">
            Expert data sourced from <a href="https://crinacle.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Crinacle</a> and <a href="https://www.audiosciencereview.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Audio Science Review</a>
          </p>
        </section>

      </div>
    </main>
  )
}
