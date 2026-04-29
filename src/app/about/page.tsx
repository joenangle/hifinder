import Link from 'next/link'
import { Heart } from 'lucide-react'

const donateUrl = process.env.NEXT_PUBLIC_DONATE_URL

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
            A free tool that matches headphones, IEMs, DACs, and amps to how you actually listen — built by one person who got tired of reading forums.
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
                    building something real, fast, and iterative to see what&apos;s possible with AI-assisted development.
                    I wanted to test the boundaries of rapid prototyping while solving a problem I actually care about.
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

        {/* What HiFinder Does */}
        <section className="mb-12">
          <div className="card p-8 bg-gradient-to-br from-surface-card to-surface-hover">
            <h2 className="heading-2 mb-4 text-center">What HiFinder Does</h2>
            <p className="text-lg text-secondary text-center mb-6">
              Finding the right audio gear shouldn&apos;t mean reading six forums and three subreddits. HiFinder cross-references measurements, expert rankings, and real pricing data to match gear to how you listen — and what you can spend.
            </p>
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

        {/* Where the Data Comes From */}
        <section className="mb-12">
          <div className="card p-8 bg-gradient-to-br from-surface-card to-surface-hover">
            <h2 className="heading-2 mb-4 text-center">Where the Data Comes From</h2>
            <p className="text-secondary text-center mb-6">
              HiFinder doesn&apos;t make up rankings. Everything is sourced from people and communities that have earned trust in the audio world.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface/50 rounded-lg p-6">
                <h3 className="font-semibold mb-2">Headphones &amp; IEMs</h3>
                <p className="text-secondary text-sm">Rankings and sound signature data from <a href="https://crinacle.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Crinacle</a>, the most comprehensive independent reviewer in the space.</p>
              </div>
              <div className="bg-surface/50 rounded-lg p-6">
                <h3 className="font-semibold mb-2">DACs &amp; Amps</h3>
                <p className="text-secondary text-sm">SINAD measurements and performance data from <a href="https://www.audiosciencereview.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Audio Science Review</a> — objective, repeatable benchmarks.</p>
              </div>
              <div className="bg-surface/50 rounded-lg p-6">
                <h3 className="font-semibold mb-2">Used Pricing</h3>
                <p className="text-secondary text-sm">Aggregated from <a href="https://www.reddit.com/r/AVexchange/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">r/AVexchange</a> and <a href="https://reverb.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Reverb</a> so you can see what gear actually sells for, not just MSRP.</p>
              </div>
              <div className="bg-surface/50 rounded-lg p-6">
                <h3 className="font-semibold mb-2">Community Discussion</h3>
                <p className="text-secondary text-sm">Reddit mentions from r/headphones and other audio subs — real opinions from real listeners, not marketing copy.</p>
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
                    Every headphone that finds a second owner is one less in a landfill. Every DAC that serves
                    a new listener is one less manufactured. Small choices, multiplied across a community, add up.
                  </p>
                  <p>
                    <strong className="text-primary">
                      This is a passion project, but it represents a belief that I can enjoy this hobby
                      while being more mindful of its impact.
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
                <h2 className="heading-2 mb-4">Get Involved</h2>
                <div className="space-y-4 text-secondary">
                  <p>
                    HiFinder is a work in progress. If you have ideas, feedback, or spot something broken,
                    I&apos;d love to hear from you.
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

        {/* Support the Project */}
        {donateUrl && (
          <section className="mb-12">
            <div className="card p-8">
              <div className="flex items-start gap-4 mb-4">
                <span className="text-4xl">❤️</span>
                <div>
                  <h2 className="heading-2 mb-4">Support the Project</h2>
                  <div className="space-y-4 text-secondary">
                    <p>
                      HiFinder is free and always will be. If it helped you find the right gear or save money
                      on the used market, consider chipping in. Donations cover hosting and data costs.
                    </p>
                    <div className="mt-6">
                      <a
                        href={donateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button-secondary inline-flex items-center gap-2"
                      >
                        <Heart className="w-4 h-4" />
                        <span>Support HiFinder</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="text-center mb-8">
          <div className="card p-8 bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20">
            <h2 className="heading-2 mb-4">Ready to Try It?</h2>
            <p className="text-secondary mb-6">
              Takes about two minutes. No account required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="button button-primary"
              >
                Find My Setup
              </Link>
              <Link
                href="/marketplace"
                className="button button-secondary"
              >
                Browse Used Market
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
