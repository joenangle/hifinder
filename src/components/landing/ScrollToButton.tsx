'use client'

export function ScrollToButton({
  targetId,
  children,
  className,
  style,
}: {
  targetId: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <button
      onClick={() =>
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })
      }
      className={className}
      style={style}
    >
      {children}
    </button>
  )
}
