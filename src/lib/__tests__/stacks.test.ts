import { describe, it, expect } from 'vitest'
import {
  checkStackCompatibility,
  isStereoStack,
  HEADPHONE_STACK_FILTER,
  purposeIcons,
  type StackWithGear,
} from '../stacks'

function stack(purpose: StackWithGear['purpose'], category: string): StackWithGear {
  return {
    id: 's1',
    user_id: 'u1',
    name: 'Living room',
    purpose,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    stack_components: [
      {
        id: 'sc1',
        stack_id: 's1',
        user_gear_id: null,
        component_id: 'c1',
        position: 0,
        created_at: '2026-01-01',
        components: { id: 'c1', brand: 'Acme', name: 'Hard To Drive', category, impedance: 600, needs_amp: true },
      },
    ],
  }
}

describe('isStereoStack', () => {
  it('is true only for the stereo purpose', () => {
    expect(isStereoStack({ purpose: 'stereo' })).toBe(true)
    expect(isStereoStack({ purpose: 'desktop' })).toBe(false)
    expect(isStereoStack({ purpose: undefined })).toBe(false)
  })
})

describe('HEADPHONE_STACK_FILTER', () => {
  it('keeps NULL-purpose stacks, which a plain neq would drop', () => {
    expect(HEADPHONE_STACK_FILTER).toBe('purpose.is.null,purpose.neq.stereo')
  })
})

describe('purposeIcons', () => {
  it('has a stereo icon', () => {
    expect(purposeIcons.stereo).toBe('🔊')
  })
})

describe('checkStackCompatibility', () => {
  it('returns [] for a stereo stack, even with a hard-to-drive item and no headphone amp', () => {
    expect(checkStackCompatibility(stack('stereo', 'cans'))).toEqual([])
  })

  it('still warns for the same contents on a headphone stack', () => {
    expect(checkStackCompatibility(stack('desktop', 'cans')).length).toBeGreaterThan(0)
  })
})
