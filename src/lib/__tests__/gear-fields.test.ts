import { describe, it, expect } from 'vitest'
import { pickGearFields, WRITABLE_GEAR_FIELDS } from '@/lib/gear-fields'

describe('pickGearFields', () => {
  it('keeps every writable field that is present', () => {
    const body = {
      component_id: 'c1',
      purchase_date: '2026-01-02',
      purchase_price: 199,
      purchase_location: 'r/AVexchange',
      condition: 'used',
      serial_number: 'SN1',
      notes: 'great',
      custom_name: 'HD 6XX',
      custom_brand: 'Drop',
      custom_category: 'cans',
    }
    expect(pickGearFields(body)).toEqual(body)
    expect(Object.keys(body).sort()).toEqual([...WRITABLE_GEAR_FIELDS].sort())
  })

  it('drops server-owned columns, including ownership', () => {
    const picked = pickGearFields({
      notes: 'mine now',
      user_id: 'attacker',
      id: 'other-row',
      is_active: false,
      is_loaned: true,
      created_at: '1999-01-01',
      updated_at: '1999-01-01',
      current_value: 9999,
    })
    expect(picked).toEqual({ notes: 'mine now' })
  })

  it('skips keys whose value is undefined', () => {
    expect(pickGearFields({ notes: undefined, condition: 'new' })).toEqual({ condition: 'new' })
  })

  it('keeps explicit nulls so a field can be cleared', () => {
    expect(pickGearFields({ serial_number: null })).toEqual({ serial_number: null })
  })

  it('returns an empty object for non-object bodies', () => {
    for (const body of [null, undefined, 'notes', 42, true, ['notes']]) {
      expect(pickGearFields(body)).toEqual({})
    }
  })

  it('does not return the caller\'s object (no aliasing)', () => {
    const body = { notes: 'x' }
    expect(pickGearFields(body)).not.toBe(body)
  })
})
