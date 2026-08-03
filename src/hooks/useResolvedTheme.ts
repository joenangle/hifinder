'use client'

import { useEffect, useState } from 'react'

/**
 * Resolves the active theme from `<html data-theme>` — which the inline script
 * in the root layout sets before first paint — and tracks runtime toggles via
 * a MutationObserver. Returns `null` until mounted so server and client markup
 * match on first render (avoids hydration mismatch).
 *
 * Use this to render only the active theme's variant of a resource (e.g. a
 * themed screenshot) instead of rendering both and hiding one with CSS, which
 * downloads both.
 */
export function useResolvedTheme(): 'light' | 'dark' | null {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)

  useEffect(() => {
    const read = () => {
      const attr = document.documentElement.getAttribute('data-theme')
      setTheme(attr === 'dark' ? 'dark' : 'light')
    }
    read()

    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return theme
}
