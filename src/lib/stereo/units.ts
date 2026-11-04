// Display units for room size and listening distance. The model and every
// saved value stay in meters; feet exist only at the input/display edge.

export type LengthUnit = 'm' | 'ft'

export const METERS_PER_FOOT = 0.3048

export const UNIT_SUFFIX: Record<LengthUnit, string> = { m: 'm', ft: 'ft' }
export const UNIT_NAME: Record<LengthUnit, string> = { m: 'meters', ft: 'feet' }

export function fromMeters(m: number, unit: LengthUnit): number {
  return unit === 'ft' ? m / METERS_PER_FOOT : m
}

export function toMeters(n: number, unit: LengthUnit): number {
  return unit === 'ft' ? n * METERS_PER_FOOT : n
}

/** A meter range expressed in the display unit (for inputs that validate as you type). */
export function rangeIn(range: readonly [number, number], unit: LengthUnit): [number, number] {
  return [fromMeters(range[0], unit), fromMeters(range[1], unit)]
}

/** One decimal place, trailing zero dropped: 4.8768 m → "4.9", 16.0 ft → "16". */
export function formatLength(m: number, unit: LengthUnit): string {
  return String(Number(fromMeters(m, unit).toFixed(1)))
}
