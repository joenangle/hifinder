'use client'

import './globals.css'

// Replaces the root layout when it fails, so it renders its own <html>/<body>
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="bg-primary">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="heading-1 mb-3">HiFinder hit a problem</h1>
            <p className="text-secondary mb-6">
              Something went wrong loading the site. Please try again in a moment.
            </p>
            <button onClick={reset} className="button button-primary">
              Try again
            </button>
            {error.digest && <p className="text-xs text-muted mt-6">Error reference: {error.digest}</p>}
          </div>
        </div>
      </body>
    </html>
  )
}
