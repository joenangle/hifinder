// Validation for the stereo catalog seed file (scripts/stereo-seed/stereo-seed.json).
//
// The spec parsers in ./specs are tolerant: they silently drop anything invalid.
// That is right at read time but wrong for a seed, which must land exactly as
// written. So the validator runs each entry through the matching parser and
// treats every dropped or altered field as an error that names the field.

import { STEREO_CATEGORIES } from '@/lib/component-categories'
import {
  parseSpeakerAmpSpecs,
  parseSpeakerSpecs,
  type SpeakerAmpSpecs,
  type SpeakerSpecs,
} from './specs'

export interface SeedEntry {
  brand: string
  name: string
  category: 'speakers' | 'speaker_amp'
  technical_specs: SpeakerSpecs | SpeakerAmpSpecs
  price_new?: number | null
  manufacturer_url?: string | null
}

export type SeedValidation = { ok: true; entry: SeedEntry } | { ok: false; errors: string[] }

const HTTP_URL = /^https?:\/\//i
const SEED_TRUSTS = ['measured', 'claimed']
const SENTINEL_REFS = ['1W', '2.83V']
const ENTRY_KEYS = new Set(['brand', 'name', 'category', 'technical_specs', 'price_new', 'manufacturer_url'])

/** Spec fields that are SpecValue objects (value + trust + source_url). */
const SPEAKER_SPEC_VALUES = [
  'sensitivity_db',
  'sensitivity_ref',
  'nominal_impedance_ohms',
  'min_impedance_ohms',
  'f3_hz',
  'directivity_q',
] as const
const AMP_SPEC_VALUES = ['power_w_8ohm', 'power_w_4ohm'] as const

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]))
  }
  if (isRecord(a) && isRecord(b)) {
    const ka = Object.keys(a)
    const kb = Object.keys(b)
    return ka.length === kb.length && ka.every((k) => k in b && deepEqual(a[k], b[k]))
  }
  return false
}

function nonEmptyString(x: unknown): x is string {
  return typeof x === 'string' && x.trim() !== ''
}

function checkSpecValues(
  specs: Record<string, unknown>,
  fields: readonly string[],
  errors: string[],
): void {
  for (const field of fields) {
    const raw = specs[field]
    if (raw === undefined || !isRecord(raw)) continue
    if (typeof raw.source_url !== 'string' || !HTTP_URL.test(raw.source_url)) {
      errors.push(`technical_specs.${field}: source_url must be an http(s) URL`)
    }
    if (typeof raw.trust !== 'string' || !SEED_TRUSTS.includes(raw.trust)) {
      errors.push(`technical_specs.${field}: trust must be 'measured' or 'claimed'`)
    }
  }
}

function checkReviewLinks(specs: Record<string, unknown>, errors: string[]): void {
  const links = specs.review_links
  if (links === undefined) return
  if (!Array.isArray(links)) {
    errors.push('technical_specs.review_links: must be an array')
    return
  }
  links.forEach((l, i) => {
    if (!isRecord(l) || typeof l.url !== 'string' || !HTTP_URL.test(l.url)) {
      errors.push(`technical_specs.review_links[${i}]: url must be an http(s) URL`)
    }
  })
}

/** Every key the parser dropped or changed is an error: the seed must round-trip. */
function checkRoundTrip(raw: Record<string, unknown>, parsed: Record<string, unknown>, errors: string[]): void {
  for (const key of Object.keys(raw)) {
    if (raw[key] === undefined) continue
    if (!(key in parsed)) {
      errors.push(`technical_specs.${key}: invalid, unknown or out of range (parser would drop it)`)
    } else if (!deepEqual(raw[key], parsed[key])) {
      errors.push(`technical_specs.${key}: contains invalid parts (parser would alter it)`)
    }
  }
}

function checkSpeaker(raw: Record<string, unknown>, parsed: SpeakerSpecs, errors: string[]): void {
  checkSpecValues(raw, SPEAKER_SPEC_VALUES, errors)
  if (!parsed.sensitivity_db) errors.push('technical_specs.sensitivity_db: required for speakers')
  if (!parsed.nominal_impedance_ohms) {
    errors.push('technical_specs.nominal_impedance_ohms: required for speakers')
  }
  const ref = parsed.sensitivity_ref?.value
  if (ref === undefined || !SENTINEL_REFS.includes(ref)) {
    errors.push("technical_specs.sensitivity_ref: required for speakers, must be '1W' or '2.83V'")
  }
}

function checkAmp(raw: Record<string, unknown>, parsed: SpeakerAmpSpecs, errors: string[]): void {
  checkSpecValues(raw, AMP_SPEC_VALUES, errors)
  if (!parsed.power_w_8ohm && !parsed.power_w_4ohm) {
    errors.push('technical_specs.power_w_8ohm / power_w_4ohm: amps need at least one power rating')
  }
  if (!parsed.power_rating?.kind) {
    errors.push('technical_specs.power_rating.kind: required for amps')
  }
}

export function validateSeedEntry(e: unknown): SeedValidation {
  if (!isRecord(e)) return { ok: false, errors: ['entry must be an object'] }
  const errors: string[] = []

  for (const key of Object.keys(e)) {
    if (!ENTRY_KEYS.has(key)) errors.push(`${key}: unknown field`)
  }
  if (!nonEmptyString(e.brand)) errors.push('brand: required')
  if (!nonEmptyString(e.name)) errors.push('name: required')
  if (typeof e.category !== 'string' || !STEREO_CATEGORIES.includes(e.category)) {
    errors.push(`category: must be one of ${STEREO_CATEGORIES.join(', ')}`)
  }
  if (e.price_new != null && !(typeof e.price_new === 'number' && Number.isFinite(e.price_new) && e.price_new >= 0)) {
    errors.push('price_new: must be a non-negative number or null')
  }
  if (e.manufacturer_url != null && !(typeof e.manufacturer_url === 'string' && HTTP_URL.test(e.manufacturer_url))) {
    errors.push('manufacturer_url: must be an http(s) URL or null')
  }

  const rawSpecs = e.technical_specs
  if (!isRecord(rawSpecs)) {
    errors.push('technical_specs: must be an object')
  } else if (e.category === 'speakers' || e.category === 'speaker_amp') {
    const parsed = e.category === 'speakers' ? parseSpeakerSpecs(rawSpecs) : parseSpeakerAmpSpecs(rawSpecs)
    checkRoundTrip(rawSpecs, parsed as Record<string, unknown>, errors)
    checkReviewLinks(rawSpecs, errors)
    if (e.category === 'speakers') checkSpeaker(rawSpecs, parsed as SpeakerSpecs, errors)
    else checkAmp(rawSpecs, parsed as SpeakerAmpSpecs, errors)
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, entry: e as unknown as SeedEntry }
}
