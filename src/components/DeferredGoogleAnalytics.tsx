'use client'

import { useEffect, useState } from 'react'
import { GoogleAnalytics } from '@next/third-parties/google'

/**
 * Loads Google Analytics (gtag.js, ~158KB) off the critical path.
 *
 * gtag.js is the single heaviest resource on the page, and nothing on first
 * paint depends on it — `trackEvent`/`trackPageView` in `@/lib/analytics`
 * no-op until `window.gtag` exists. So we hold the script back until the
 * browser is idle (or the user first interacts, whichever comes first),
 * leaving the critical path for HTML/CSS/JS/LCP image.
 */
export function DeferredGoogleAnalytics({ gaId }: { gaId: string }) {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (shouldLoad) return

    let triggered = false
    const trigger = () => {
      if (triggered) return
      triggered = true
      setShouldLoad(true)
    }

    const interactionEvents = ['scroll', 'pointerdown', 'keydown', 'touchstart']
    const opts: AddEventListenerOptions = { once: true, passive: true }
    interactionEvents.forEach((e) => window.addEventListener(e, trigger, opts))

    // Load when the main thread goes idle; cap the wait so it always loads.
    // requestIdleCallback is absent in older Safari — fall back to a timeout.
    const supportsIdle = typeof window.requestIdleCallback === 'function'
    const idleId = supportsIdle
      ? window.requestIdleCallback(trigger, { timeout: 5000 })
      : window.setTimeout(trigger, 4000)

    return () => {
      interactionEvents.forEach((e) => window.removeEventListener(e, trigger))
      if (supportsIdle) window.cancelIdleCallback(idleId as number)
      else window.clearTimeout(idleId as number)
    }
  }, [shouldLoad])

  return shouldLoad ? <GoogleAnalytics gaId={gaId} /> : null
}
