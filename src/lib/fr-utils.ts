// Frequency Response data types and utilities

export interface FRData {
  points: [number, number][] // [freq_hz, amplitude_db]
  source: string
  channels: number
}

export interface FRCurve {
  name: string
  color: string
  points: [number, number][]
}

/**
 * Parse and validate raw FR data from the database.
 * Returns typed FRData if valid, null otherwise.
 */
export function parseFRData(raw: Record<string, unknown> | null | undefined): FRData | null {
  if (!raw) return null
  const points = raw.points
  if (!Array.isArray(points) || points.length === 0) return null
  // Spot-check first entry to validate structure
  const first = points[0]
  if (!Array.isArray(first) || first.length !== 2 || typeof first[0] !== 'number' || typeof first[1] !== 'number') {
    return null
  }
  return {
    points: points as [number, number][],
    source: (raw.source as string) || 'unknown',
    channels: (raw.channels as number) || 1,
  }
}

/**
 * Normalize FR curve so the value at 1kHz is 0dB.
 * Finds the point closest to 1000Hz and subtracts its dB value from all points.
 */
export function normalizeTo1kHz(points: [number, number][]): [number, number][] {
  if (points.length === 0) return points
  let closestIdx = 0
  let closestDist = Math.abs(points[0][0] - 1000)
  for (let i = 1; i < points.length; i++) {
    const dist = Math.abs(points[i][0] - 1000)
    if (dist < closestDist) {
      closestDist = dist
      closestIdx = i
    }
  }
  const offset = points[closestIdx][1]
  return points.map(([freq, db]) => [freq, db - offset])
}

/**
 * Evenly downsample FR points by index stepping.
 */
export function downsampleFR(points: [number, number][], targetCount = 50): [number, number][] {
  if (points.length <= targetCount) return points
  const step = (points.length - 1) / (targetCount - 1)
  const result: [number, number][] = []
  for (let i = 0; i < targetCount; i++) {
    result.push(points[Math.round(i * step)])
  }
  return result
}

/**
 * Format frequency in Hz for axis labels and tooltips.
 * ≤100 Hz: up to 1 decimal (trailing .0 trimmed) — 20→"20", 73.56→"73.6"
 * 100–999 Hz: integer — 250.4→"250"
 * ≥1000 Hz: kHz with up to 1 decimal (trailing .0 trimmed) — 1500→"1.5k", 10000→"10k"
 */
export function formatFrequency(hz: number): string {
  if (hz >= 1000) {
    const rounded = Math.round(hz / 100) / 10
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}k`
  }
  if (hz > 100) {
    return String(Math.round(hz))
  }
  const rounded = Math.round(hz * 10) / 10
  return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)
}

/** Frequency band definitions for FR charts */
export const FR_BANDS = [
  { name: 'Sub-Bass', start: 20, end: 60 },
  { name: 'Bass', start: 60, end: 250 },
  { name: 'Mids', start: 250, end: 2000 },
  { name: 'Upper Mids', start: 2000, end: 4000 },
  { name: 'Treble', start: 4000, end: 10000 },
  { name: 'Air', start: 10000, end: 20000 },
] as const

/** Tick positions for log-scaled frequency axis */
export const FR_TICKS = [20, 100, 1000, 10000, 20000]

/** Colors for comparison mode curves */
export const COMPARISON_COLORS = ['#8b5cf6', '#f59e0b', '#22c55e', '#ef4444']

/**
 * Analyze an FR curve and return plain-language descriptions of what the user will hear.
 * Normalizes to 1kHz reference, then checks each band for deviations.
 */
export function interpretFR(points: [number, number][]): string[] {
  if (points.length < 10) return []
  const norm = normalizeTo1kHz(points)

  // Average dB in each band
  function avgInRange(lo: number, hi: number): number {
    let sum = 0, count = 0
    for (const [f, db] of norm) {
      if (f >= lo && f <= hi) { sum += db; count++ }
    }
    return count > 0 ? sum / count : 0
  }

  const subBass = avgInRange(20, 60)
  const bass = avgInRange(60, 250)
  const mids = avgInRange(250, 2000)
  const upperMids = avgInRange(2000, 4000)
  const treble = avgInRange(4000, 10000)
  const air = avgInRange(10000, 20000)

  const insights: string[] = []
  const threshold = 2.5 // dB deviation to consider notable

  // Bass region
  if (subBass > threshold && bass > threshold) {
    insights.push('Strong low-end presence — you\'ll feel rumble and weight in bass-heavy tracks')
  } else if (bass > threshold) {
    insights.push('Elevated mid-bass adds warmth and body to vocals and instruments')
  } else if (subBass > threshold) {
    insights.push('Extended sub-bass gives depth and rumble without muddying the mids')
  } else if (bass < -threshold) {
    insights.push('Lean bass response — tight and controlled, prioritizing clarity over impact')
  }

  // Mids
  if (mids > threshold) {
    insights.push('Forward midrange brings vocals and instruments closer, great for acoustic music')
  } else if (mids < -threshold) {
    insights.push('Recessed mids create a wider soundstage but vocals may sit further back')
  }

  // Upper mids / presence
  if (upperMids > threshold) {
    insights.push('Elevated presence region adds clarity and detail to vocals and snare')
  } else if (upperMids < -threshold) {
    insights.push('Relaxed upper mids make for a smoother, less fatiguing listen')
  }

  // Treble
  if (treble > threshold) {
    insights.push('Bright treble emphasizes detail and sparkle — can reveal poorly mastered tracks')
  } else if (treble < -threshold) {
    insights.push('Rolled-off treble gives a smooth, forgiving presentation')
  }

  // Air
  if (air > threshold) {
    insights.push('Extended air region adds a sense of openness and space')
  } else if (air < -threshold * 1.5) {
    insights.push('Limited extension above 10kHz — cymbals and reverb tails may sound truncated')
  }

  // Overall shape
  if (bass > threshold && treble > threshold && mids < 0) {
    insights.push('V-shaped tuning — exciting and energetic, great for pop and electronic')
  }

  return insights
}
