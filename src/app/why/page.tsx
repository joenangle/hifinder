'use client'

export default function WhyPage() {
  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="heading-1 mb-6">
            Why HiFinder?
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            A learning experiment that became a mission to make high-quality audio more accessible and sustainable.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* The Learning Journey */}
          <section className="card p-8">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-4xl">🚀</span>
              <div>
                <h2 className="heading-3 mb-4">The Learning Journey</h2>
                <div className="space-y-4 text-text-secondary">
                  <p>
                    HiFinder started as a personal experiment in &ldquo;<strong className="text-text-primary">vibecoding</strong>&rdquo; —
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
          </section>

          {/* The Environmental Mission */}
          <section className="card p-8">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-4xl">🌱</span>
              <div>
                <h2 className="heading-3 mb-4">The Environmental Mission</h2>
                <div className="space-y-4 text-text-secondary">
                  <p>
                    Audio gear doesn&apos;t need to be disposable. A well-made pair of headphones or a quality DAC/amp
                    can last decades with proper care. Yet the industry thrives on the constant churn of new releases,
                    and perfectly good equipment ends up as e-waste.
                  </p>
                  <p>
                    <strong className="text-text-primary">My hope is that by making used equipment more discoverable and trustworthy</strong>,
                    HiFinder can help reduce the environmental impact of a hobby I love and share with countless other
                    listeners and audio enthusiasts.
                  </p>
                  <p className="text-sm border-l-4 border-accent-primary pl-4 italic">
                    &ldquo;Buying one used headphone instead of new saves about 14kg of CO₂ — barely a dent in your annual footprint. But if enough of us make it normal, manufacturers will have to build gear <a href="https://medium.com/@joenangle/the-life-deaths-of-a-toothbrush-da5e8b1cd408" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline font-semibold">that lasts</a>. That&apos;s when real change happens.&rdquo;
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="card p-8">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-4xl">🔍</span>
              <div>
                <h2 className="heading-3 mb-4">How HiFinder Helps</h2>
                <div className="space-y-4 text-text-secondary">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-accent-primary font-bold">→</span>
                      <span><strong className="text-text-primary">Expert-guided recommendations</strong> based on Crinacle&apos;s measurements and community ratings</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-primary font-bold">→</span>
                      <span><strong className="text-text-primary">Used market integration</strong> to surface quality pre-owned gear from trusted sources</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-primary font-bold">→</span>
                      <span><strong className="text-text-primary">Transparent pricing</strong> showing both new and used market values</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-accent-primary font-bold">→</span>
                      <span><strong className="text-text-primary">System building tools</strong> to help you put together complete, compatible setups</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* The Broader Vision */}
          <section className="card p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-700">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-4xl">💡</span>
              <div>
                <h2 className="heading-3 mb-4">The Bigger Picture</h2>
                <div className="space-y-4 text-text-secondary">
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
                    <strong className="text-text-primary">
                      This is a passion project built by one person learning to code, but it represents a belief
                      that we can enjoy our hobbies while being more mindful of their impact.
                    </strong>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Community & Open Source */}
          <section className="card p-8">
            <div className="flex items-start gap-4 mb-4">
              <span className="text-4xl">🤝</span>
              <div>
                <h2 className="heading-3 mb-4">Join the Mission</h2>
                <div className="space-y-4 text-text-secondary">
                  <p>
                    HiFinder is a work in progress, and I&apos;m always looking to improve it. If you have ideas,
                    feedback, or want to contribute, I&apos;d love to hear from you.
                  </p>
                  <div className="flex flex-wrap gap-4 mt-6">
                    <a
                      href="https://github.com/joenangle/hifinder"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors inline-flex items-center gap-2"
                    >
                      <span>⭐</span>
                      <span>Star on GitHub</span>
                    </a>
                    <a
                      href="mailto:hello@hifinder.app"
                      className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-text-primary rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
                    >
                      <span>✉️</span>
                      <span>Get in Touch</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Credits */}
          <section className="text-center py-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-text-tertiary mb-2">
              Built with Next.js, Supabase, and lots of coffee
            </p>
            <p className="text-sm text-text-tertiary">
              Expert data sourced from <a href="https://crinacle.com" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">Crinacle</a> and <a href="https://www.audiosciencereview.com" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline">Audio Science Review</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
