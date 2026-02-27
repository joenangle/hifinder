'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'
import { ArrowRight, ChevronDown } from 'lucide-react'

export function FloatingBar() {
  const [pastHero, setPastHero] = useState(false)

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.6)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'max(24px, calc(env(safe-area-inset-bottom) + 12px))',
        left: '50%',
        transform: `translateX(-50%) translateY(${pastHero ? '120%' : '0'})`,
        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.35s',
        opacity: pastHero ? 0 : 1,
        zIndex: 50,
        pointerEvents: pastHero ? 'none' : 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'var(--background-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: '999px',
        padding: '10px 10px 10px 20px',
        boxShadow: '0 8px 32px -4px rgba(0,0,0,0.18), 0 0 0 1px var(--border-subtle)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <span
        className="text-sm font-medium whitespace-nowrap"
        style={{ color: 'var(--text-secondary)' }}
      >
        Scroll to explore
      </span>
      <button
        aria-label="Scroll down"
        onClick={() => window.scrollBy({ top: window.innerHeight * 0.85, behavior: 'smooth' })}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'var(--background-secondary)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          flexShrink: 0,
        }}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      <Link
        href="/recommendations"
        className="inline-flex items-center gap-2 font-semibold text-sm whitespace-nowrap"
        style={{
          background: 'var(--text-primary)',
          color: 'var(--background-primary)',
          padding: '8px 18px',
          borderRadius: '999px',
          textDecoration: 'none',
        }}
        onClick={() =>
          trackEvent({ name: 'hero_cta_clicked', properties: { location: 'floating_bar' } })
        }
      >
        Find my setup
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
