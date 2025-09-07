import Link from 'next/link'

interface LogoProps {
  className?: string
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <Link 
      href="/" 
      className={`inline-flex items-center gap-2 text-xl font-bold tracking-tight hover:opacity-80 transition-opacity ${className}`}
    >
      <span className="text-2xl">🎧</span>
      <span className="text-accent-primary">
        HiFinder
      </span>
    </Link>
  )
}