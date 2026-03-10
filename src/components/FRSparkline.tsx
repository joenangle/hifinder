import { downsampleFR } from '@/lib/fr-utils'

interface FRSparklineProps {
  points: [number, number][]
  width?: number
  height?: number
  className?: string
}

export function FRSparkline({ points, width = 80, height = 28, className }: FRSparklineProps) {
  const sampled = downsampleFR(points, 50)
  if (sampled.length < 2) return null

  const pad = 2
  const w = width - pad * 2
  const h = height - pad * 2

  // Log-scale frequency mapping
  const logMin = Math.log10(sampled[0][0])
  const logMax = Math.log10(sampled[sampled.length - 1][0])
  const logRange = logMax - logMin || 1

  // dB range
  let dbMin = Infinity
  let dbMax = -Infinity
  for (const [, db] of sampled) {
    if (db < dbMin) dbMin = db
    if (db > dbMax) dbMax = db
  }
  const dbRange = dbMax - dbMin || 1

  const polylinePoints = sampled
    .map(([freq, db]) => {
      const x = pad + ((Math.log10(freq) - logMin) / logRange) * w
      const y = pad + ((dbMax - db) / dbRange) * h // inverted: higher dB = higher on chart
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <polyline
        points={polylinePoints}
        stroke="currentColor"
        strokeWidth={1.5}
        fill="none"
      />
    </svg>
  )
}
