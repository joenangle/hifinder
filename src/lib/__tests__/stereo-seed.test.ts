import { describe, it, expect } from 'vitest'
import { validateSeedEntry } from '../stereo/seed'

const sv = (value: unknown, trust: unknown = 'measured', source_url: unknown = 'https://example.com/m') => ({
  value,
  trust,
  source_url,
})

const speaker = () => ({
  brand: 'KEF',
  name: 'LS50 Meta',
  category: 'speakers',
  price_new: 1599,
  manufacturer_url: 'https://example.com/ls50',
  technical_specs: {
    sensitivity_db: sv(85),
    sensitivity_ref: sv('2.83V', 'claimed'),
    nominal_impedance_ohms: sv(8, 'claimed'),
    review_links: [{ outlet: 'Erin', url: 'https://example.com/r', kind: 'measurement' }],
  } as Record<string, unknown>,
})

const amp = () => ({
  brand: 'Topping',
  name: 'PA5',
  category: 'speaker_amp',
  technical_specs: {
    subtype: 'power',
    power_w_8ohm: sv(100, 'claimed'),
    power_rating: { kind: 'continuous', thd_pct: 0.1, channels_driven: 'all' },
  } as Record<string, unknown>,
})

function errorsOf(e: unknown): string[] {
  const r = validateSeedEntry(e)
  if (r.ok) throw new Error('expected rejection')
  return r.errors
}

describe('validateSeedEntry', () => {
  it('accepts a valid speaker and keeps its values unchanged', () => {
    const input = speaker()
    const r = validateSeedEntry(input)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.entry).toEqual(input)
  })

  it('accepts a valid amp and keeps its values unchanged', () => {
    const input = amp()
    const r = validateSeedEntry(input)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.entry).toEqual(input)
  })

  it('rejects non-object input', () => {
    expect(errorsOf(null)[0]).toMatch(/object/)
  })

  it('rejects a missing brand', () => {
    const e = { ...speaker(), brand: '  ' }
    expect(errorsOf(e).join()).toMatch(/brand/)
  })

  it('rejects a missing name', () => {
    const { name: _name, ...e } = speaker()
    expect(errorsOf(e).join()).toMatch(/name/)
  })

  it('rejects a category outside STEREO_CATEGORIES', () => {
    expect(errorsOf({ ...speaker(), category: 'cans' }).join()).toMatch(/category/)
  })

  it('rejects a spec value without an http(s) source_url', () => {
    const e = speaker()
    e.technical_specs.sensitivity_db = sv(85, 'measured', 'ftp://nope')
    expect(errorsOf(e).join()).toMatch(/sensitivity_db.*source_url/)
    const e2 = speaker()
    e2.technical_specs.nominal_impedance_ohms = sv(8, 'claimed', null)
    expect(errorsOf(e2).join()).toMatch(/nominal_impedance_ohms.*source_url/)
  })

  it('rejects a trust other than measured or claimed', () => {
    for (const trust of ['user', 'assumed', 'bogus']) {
      const e = speaker()
      e.technical_specs.sensitivity_db = sv(85, trust)
      expect(errorsOf(e).join()).toMatch(/sensitivity_db.*trust/)
    }
  })

  it('rejects a spec value the parser would drop, naming the field', () => {
    const e = speaker()
    e.technical_specs.sensitivity_db = sv(200)
    expect(errorsOf(e).join()).toMatch(/sensitivity_db/)
    const e2 = speaker()
    e2.technical_specs.nominal_impedance_ohms = sv('8 ohms', 'claimed')
    expect(errorsOf(e2).join()).toMatch(/nominal_impedance_ohms/)
  })

  it('rejects unknown technical_specs fields rather than dropping them', () => {
    const e = speaker()
    e.technical_specs.weight_kg = sv(10)
    expect(errorsOf(e).join()).toMatch(/weight_kg/)
  })

  it('rejects review_links entries without http(s) urls', () => {
    const e = speaker()
    e.technical_specs.review_links = [{ outlet: 'Erin', url: 'javascript:alert(1)', kind: 'measurement' }]
    expect(errorsOf(e).join()).toMatch(/review_links/)
  })

  it('requires speakers to have sensitivity_db', () => {
    const e = speaker()
    delete e.technical_specs.sensitivity_db
    expect(errorsOf(e).join()).toMatch(/sensitivity_db/)
  })

  it('requires speakers to have nominal_impedance_ohms', () => {
    const e = speaker()
    delete e.technical_specs.nominal_impedance_ohms
    expect(errorsOf(e).join()).toMatch(/nominal_impedance_ohms/)
  })

  it('requires speakers to have a known sensitivity_ref', () => {
    const e = speaker()
    delete e.technical_specs.sensitivity_ref
    expect(errorsOf(e).join()).toMatch(/sensitivity_ref/)
    const e2 = speaker()
    e2.technical_specs.sensitivity_ref = sv('unknown', 'claimed')
    expect(errorsOf(e2).join()).toMatch(/sensitivity_ref/)
  })

  it('rejects an amp with neither power rating', () => {
    const e = amp()
    delete e.technical_specs.power_w_8ohm
    expect(errorsOf(e).join()).toMatch(/power_w_8ohm|power_w_4ohm/)
  })

  it('accepts an amp with only a 4 ohm rating', () => {
    const e = amp()
    delete e.technical_specs.power_w_8ohm
    e.technical_specs.power_w_4ohm = sv(150, 'claimed')
    expect(validateSeedEntry(e).ok).toBe(true)
  })

  it('requires amps to have power_rating.kind', () => {
    const e = amp()
    delete e.technical_specs.power_rating
    expect(errorsOf(e).join()).toMatch(/power_rating/)
  })

  it('rejects an invalid power_rating rather than dropping parts of it', () => {
    const e = amp()
    e.technical_specs.power_rating = { kind: 'continuous', thd_pct: 500 }
    expect(errorsOf(e).join()).toMatch(/power_rating/)
  })

  it('rejects a negative price_new', () => {
    expect(errorsOf({ ...speaker(), price_new: -5 }).join()).toMatch(/price_new/)
  })
})

describe('validateSeedEntry: in-room sensitivity flag', () => {
  it('accepts a sourced sensitivity_in_room flag', () => {
    const e = speaker()
    e.technical_specs.sensitivity_in_room = sv(true, 'claimed')
    expect(validateSeedEntry(e).ok).toBe(true)
  })

  it('requires a source for the flag and a boolean value', () => {
    const unsourced = speaker()
    unsourced.technical_specs.sensitivity_in_room = { value: true, trust: 'claimed' }
    expect(errorsOf(unsourced).join()).toMatch(/sensitivity_in_room: source_url/)

    const notBoolean = speaker()
    notBoolean.technical_specs.sensitivity_in_room = sv('yes', 'claimed')
    expect(errorsOf(notBoolean).join()).toMatch(/sensitivity_in_room/)
  })
})
