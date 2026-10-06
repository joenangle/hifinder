import Link from 'next/link'

export const metadata = {
  title: 'Page not found | HiFinder',
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-sm font-semibold text-accent mb-2">404</p>
        <h1 className="heading-1 mb-3">We couldn&apos;t find that page</h1>
        <p className="text-secondary mb-6">
          The link may be out of date, or the gear may have been removed from the catalog.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/browse" className="button button-primary">
            Browse the catalog
          </Link>
          <Link href="/recommendations" className="button button-secondary">
            Get recommendations
          </Link>
        </div>
      </div>
    </div>
  )
}
