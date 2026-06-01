import { describe, it, expect } from 'vitest'
import {
  parseGearCsv,
  normalizeGearKey,
  buildComponentIndex,
  matchGearRow,
  buildGearInsert,
  type ParsedGearRow,
} from '../gear-import'

const HEADER = 'Brand,Model,Category,Purchase Date,Price Paid,Condition,Location,Notes'

describe('parseGearCsv', () => {
  it('parses the standard export header + rows', () => {
    const { rows, errors } = parseGearCsv(
      `${HEADER}\nSennheiser,HD 600,cans,2024-01-05,250,used,NYC,Great pads`
    )
    expect(errors).toEqual([])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      brand: 'Sennheiser',
      model: 'HD 600',
      category: 'cans',
      purchaseDate: '2024-01-05',
      pricePaid: '250',
      condition: 'used',
      location: 'NYC',
      notes: 'Great pads',
    })
  })

  it('handles quoted fields containing commas', () => {
    const { rows } = parseGearCsv(`${HEADER}\nFocal,Clear,cans,,800,used,"Austin, TX","mint, boxed"`)
    expect(rows[0].location).toBe('Austin, TX')
    expect(rows[0].notes).toBe('mint, boxed')
  })

  it('skips blank lines and pads missing trailing columns', () => {
    const { rows } = parseGearCsv(`${HEADER}\nSchiit,Magni,amp\n\n`)
    expect(rows).toHaveLength(1)
    expect(rows[0].brand).toBe('Schiit')
    expect(rows[0].notes).toBe('')
  })

  it('accepts header aliases (Name, Date, Price) case-insensitively', () => {
    const { rows, errors } = parseGearCsv('brand,name,category,date,price\nDan Clark,Aeon,cans,2023,500')
    expect(errors).toEqual([])
    expect(rows[0]).toMatchObject({ brand: 'Dan Clark', model: 'Aeon', pricePaid: '500' })
  })

  it('errors when Brand or Model columns are absent', () => {
    const { rows, errors } = parseGearCsv('Foo,Bar\n1,2')
    expect(rows).toHaveLength(0)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('errors on empty input', () => {
    expect(parseGearCsv('').errors.length).toBeGreaterThan(0)
  })
})

describe('normalizeGearKey', () => {
  it('strips all separators so spacing/punctuation variants collapse', () => {
    expect(normalizeGearKey('Sennheiser', 'HD-600')).toBe('sennheiserhd600')
    expect(normalizeGearKey('Sennheiser', 'HD 600')).toBe('sennheiserhd600')
    expect(normalizeGearKey('  Focal ', 'Clear  Mg')).toBe('focalclearmg')
  })
})

describe('buildComponentIndex + matchGearRow', () => {
  const index = buildComponentIndex([
    { id: 'c1', brand: 'Sennheiser', name: 'HD 600' },
    { id: 'c2', brand: 'Focal', name: 'Clear' },
  ])
  const row = (over: Partial<ParsedGearRow> = {}): ParsedGearRow => ({
    brand: 'Sennheiser',
    model: 'HD600',
    category: 'cans',
    purchaseDate: '',
    pricePaid: '',
    condition: '',
    location: '',
    notes: '',
    ...over,
  })

  it('matches case/punctuation-insensitively to a component id', () => {
    expect(matchGearRow(row({ brand: 'sennheiser', model: 'hd-600' }), index)).toEqual({
      matched: true,
      component_id: 'c1',
    })
  })

  it('reports no match for unknown gear', () => {
    expect(matchGearRow(row({ brand: 'Grado', model: 'SR80' }), index)).toEqual({ matched: false })
  })
})

describe('buildGearInsert', () => {
  const row: ParsedGearRow = {
    brand: 'Sennheiser',
    model: 'HD 600',
    category: 'cans',
    purchaseDate: '2024-01-05',
    pricePaid: '$1,250',
    condition: 'Used',
    location: 'NYC',
    notes: 'mint',
  }

  it('uses component_id for matched rows and parses price/condition', () => {
    const insert = buildGearInsert(row, { matched: true, component_id: 'c1' })
    expect(insert).toEqual({
      component_id: 'c1',
      purchase_date: '2024-01-05',
      purchase_price: 1250,
      condition: 'used',
      purchase_location: 'NYC',
      notes: 'mint',
    })
  })

  it('uses custom fields for unmatched rows', () => {
    const insert = buildGearInsert(row, { matched: false })
    expect(insert).toMatchObject({
      custom_brand: 'Sennheiser',
      custom_name: 'HD 600',
      custom_category: 'cans',
    })
    expect(insert.component_id).toBeUndefined()
  })

  it('omits blank optional fields', () => {
    const blank: ParsedGearRow = {
      brand: 'X',
      model: 'Y',
      category: '',
      purchaseDate: '',
      pricePaid: '',
      condition: '',
      location: '',
      notes: '',
    }
    const insert = buildGearInsert(blank, { matched: true, component_id: 'c9' })
    expect(insert).toEqual({ component_id: 'c9' })
  })
})
