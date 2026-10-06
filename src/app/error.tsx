'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="heading-1 mb-3">Something went wrong</h1>
        <p className="text-secondary mb-6">
          This page hit an unexpected error. Trying again usually fixes it.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={reset} className="button button-primary">
            Try again
          </button>
          <Link href="/" className="button button-secondary">
            Go home
          </Link>
        </div>
        {error.digest && <p className="text-xs text-muted mt-6">Error reference: {error.digest}</p>}
      </div>
    </div>
  )
}
