'use client'

import dynamic from 'next/dynamic'

// FloatingBar is a scroll-triggered, position:fixed CTA bar — invisible at
// first paint and irrelevant to SEO. Load it client-only so it's neither in
// the SSR payload nor hydrated on the critical path. Being fixed-position, it
// causes no layout shift when it mounts.
const FloatingBar = dynamic(
  () => import('./FloatingBar').then((m) => ({ default: m.FloatingBar })),
  { ssr: false }
)

export function FloatingBarLazy() {
  return <FloatingBar />
}
