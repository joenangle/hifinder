import Link from 'next/link'

interface LogoProps {
  className?: string
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <Link 
      href="/" 
      className={`inline-flex items-center gap-2 text-xl tracking-tight hover:opacity-80 transition-opacity ${className}`}
      style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
    >
      <span className="text-2xl">🎧</span>
      <span style={{ color: 'var(--accent-secondary)' }}>
        HiFinder
      </span>
    </Link>
  )
}