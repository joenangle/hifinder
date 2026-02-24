import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'
import { ArrowRight } from 'lucide-react'
import { supabaseServer } from '@/lib/supabase-server'
import { TrackableLink } from './landing/TrackableLink'
import { FeatureCards } from './landing/FeatureCards'
import { FloatingBar } from './landing/FloatingBar'

async function getStats() {
  try {
    const [componentResult, listingsResult] = await Promise.all([
      supabaseServer.from('components').select('*', { count: 'exact', head: true }),
      supabaseServer.from('used_listings').select('*', { count: 'exact', head: true }),
    ])

    return {
      components: componentResult.count || 579,
      listings: listingsResult.count || 316,
    }
  } catch {
    return { components: 579, listings: 316 }
  }
}

export async function LandingPage() {
  const stats = await getStats()

  return (
    <div style={{ background: 'var(--background-primary)' }}>

      {/* ─────────────────────────────────────────
          HERO — full-bleed, split layout
          Server-rendered: zero JS needed for first paint
      ───────────────────────────────────────── */}
      <section
        style={{
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Background grid texture */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        />
        {/* Radial fade over grid */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 70% 60% at 50% 50%, var(--background-primary) 40%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        <div
          className="container mx-auto px-6"
          style={{ maxWidth: '1100px', position: 'relative', zIndex: 1 }}
        >
          <div className="grid lg:grid-cols-[1fr_440px] gap-12 items-center">

            {/* ── Left copy ── */}
            <div>
              {/* Eyebrow */}
              <div
                className="inline-flex items-center gap-2 mb-8"
                style={{
                  background: 'var(--background-secondary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '999px',
                  padding: '6px 14px',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--text-secondary)', letterSpacing: '0.04em' }}
                >
                  Audio gear, simplified
                </span>
              </div>

              {/* Headline */}
              <h1
                className="font-bold"
                style={{
                  fontSize: 'clamp(2.75rem, 6vw, 5rem)',
                  lineHeight: 1.0,
                  letterSpacing: '-0.04em',
                  color: 'var(--text-primary)',
                  marginBottom: '1.5rem',
                }}
              >
                Listen better.
                <br />
                <span
                  style={{
                    WebkitTextStroke: '2px var(--text-primary)',
                    color: 'transparent',
                  }}
                >
                  Spend smarter.
                </span>
              </h1>

              {/* Sub */}
              <p
                style={{
                  fontSize: '1.125rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.75,
                  maxWidth: '460px',
                  marginBottom: '2.5rem',
                }}
              >
                HiFinder matches you with audio gear that suits your ears, your budget, and
                the way you actually listen — no forums, no guesswork.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3" style={{ marginBottom: '3rem' }}>
                <TrackableLink
                  href="/recommendations"
                  event={{ name: 'hero_cta_clicked', properties: { location: 'hero_primary' } }}
                  className="inline-flex items-center gap-2 font-semibold transition-all duration-150 group"
                  style={{
                    background: 'var(--text-primary)',
                    color: 'var(--background-primary)',
                    padding: '14px 24px',
                    borderRadius: '12px',
                    fontSize: '0.9375rem',
                  }}
                >
                  Find my setup
                  <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                </TrackableLink>
                <TrackableLink
                  href="/learn"
                  event={{ name: 'learn_clicked', properties: { location: 'hero_secondary' } }}
                  className="inline-flex items-center gap-2 font-medium transition-all duration-150"
                  style={{
                    color: 'var(--text-secondary)',
                    padding: '14px 24px',
                    borderRadius: '12px',
                    fontSize: '0.9375rem',
                    border: '1px solid var(--border-default)',
                    background: 'transparent',
                  }}
                >
                  Learn the basics
                </TrackableLink>
              </div>

              {/* Stats — server-rendered with live data */}
              <div className="flex gap-8">
                {[
                  { n: `${stats.components}+`, label: 'Components indexed' },
                  { n: `${stats.listings}+`, label: 'Used listings' },
                  { n: 'Free', label: 'No account needed' },
                ].map((s) => (
                  <div key={s.label}>
                    <div
                      className="font-semibold"
                      style={{
                        fontSize: '1.1rem',
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {s.n}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: 'var(--text-tertiary)', marginTop: '2px' }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right image ── */}
            <div className="hidden lg:block relative">
              {/* Accent square behind */}
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  top: '12%',
                  right: '-8%',
                  width: '80%',
                  height: '80%',
                  borderRadius: '24px',
                  background: 'rgba(var(--accent-primary-rgb), 0.08)',
                  border: '1px solid rgba(var(--accent-primary-rgb), 0.15)',
                }}
              />
              <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                  boxShadow: '0 40px 80px -20px rgba(0,0,0,0.22), 0 0 0 1px var(--border-subtle)',
                }}
              >
                <Image
                  src="/images/hero-headphones.webp"
                  alt="Premium audio headphones"
                  width={880}
                  height={580}
                  sizes="(max-width: 1023px) 0px, 440px"
                  className="w-full h-auto object-cover"
                  priority
                  style={{ display: 'block' }}
                />
              </div>
              {/* Photo credit */}
              <p
                className="text-xs mt-2 text-right"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Photo:{' '}
                <a
                  href="https://www.flickr.com/photos/fourfridays/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-tertiary)' }}
                  className="hover:underline"
                >
                  Umair Abassi
                </a>
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          MARQUEE STRIP — thin social proof line
      ───────────────────────────────────────── */}
      <div
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--background-secondary)',
          padding: '14px 0',
          overflow: 'hidden',
        }}
      >
        <div
          className="flex items-center gap-12 px-8"
          style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', letterSpacing: '0.06em' }}
        >
          {['HEADPHONES', 'IEMS', 'DACS', 'AMPLIFIERS', 'CABLES', 'SOURCES', 'STACKS', 'USED MARKET'].map(
            (t, i) => (
              <span key={t} className="whitespace-nowrap flex items-center gap-12">
                {i > 0 && (
                  <span aria-hidden style={{ opacity: 0.35 }}>
                    /
                  </span>
                )}
                {t}
              </span>
            )
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────
          FEATURES — client island for hover/click
      ───────────────────────────────────────── */}
      <Suspense>
        <FeatureCards />
      </Suspense>

      {/* ─────────────────────────────────────────
          HOW IT WORKS — 3-step inline row
      ───────────────────────────────────────── */}
      <section
        style={{
          borderTop: '1px solid var(--border-subtle)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '80px 0',
          background: 'var(--background-secondary)',
        }}
      >
        <div className="container mx-auto px-6" style={{ maxWidth: '1100px' }}>

          <p
            className="text-xs font-semibold mb-10"
            style={{
              color: 'var(--accent-primary)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            How it works
          </p>

          <div className="grid sm:grid-cols-3 gap-0">
            {[
              {
                step: '01',
                title: 'Tell us how you listen',
                body: 'Headphones at home, IEMs at the gym, or both? We ask a handful of questions about your habits, budget, and gear.',
              },
              {
                step: '02',
                title: 'We match gear to you',
                body: 'Our system cross-references measurements, user reviews, and synergy data to rank real options — not affiliate-stuffed lists.',
              },
              {
                step: '03',
                title: 'Build, track, and upgrade',
                body: 'Save your setup, monitor used market prices, and get alerts when a better deal surfaces for gear on your wishlist.',
              },
            ].map((s, i) => (
              <div
                key={s.step}
                style={{
                  padding: '0 40px 0 0',
                  borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                  paddingLeft: i > 0 ? '40px' : '0',
                }}
              >
                <span
                  className="font-bold block mb-4"
                  style={{
                    fontSize: '2.5rem',
                    color: 'var(--border-default)',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                  }}
                >
                  {s.step}
                </span>
                <h3
                  className="font-semibold mb-2"
                  style={{ fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.3 }}
                >
                  {s.title}
                </h3>
                <p
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
                >
                  {s.body}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────
          BOTTOM CTA — full bleed, editorial
      ───────────────────────────────────────── */}
      <section style={{ padding: '120px 0' }}>
        <div className="container mx-auto px-6" style={{ maxWidth: '1100px' }}>
          <div style={{ maxWidth: '640px' }}>
            <h2
              className="font-bold"
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                letterSpacing: '-0.04em',
                lineHeight: 1.05,
                color: 'var(--text-primary)',
                marginBottom: '1.5rem',
              }}
            >
              Stop reading forums.
              <br />
              <span style={{ color: 'var(--text-tertiary)' }}>Start listening better.</span>
            </h2>
            <p
              style={{
                fontSize: '1.0625rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                marginBottom: '2.5rem',
                maxWidth: '480px',
              }}
            >
              HiFinder is free, no account required. Get a personalized recommendation
              in under two minutes.
            </p>
            <TrackableLink
              href="/recommendations"
              event={{ name: 'final_cta_clicked', properties: { location: 'bottom_cta' } }}
              className="inline-flex items-center gap-2 font-semibold transition-all duration-150 group"
              style={{
                background: 'var(--accent-primary)',
                color: '#fff',
                padding: '15px 28px',
                borderRadius: '12px',
                fontSize: '0.9375rem',
                boxShadow: 'rgba(var(--accent-primary-rgb), 0.3) 0px 4px 20px',
                textDecoration: 'none',
              }}
            >
              Get my recommendation
              <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
            </TrackableLink>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          FLOATING BOTTOM BAR — client island
      ───────────────────────────────────────── */}
      <FloatingBar />

    </div>
  )
}
