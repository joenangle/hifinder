import {
  createParser,
  createSerializer,
  parseAsArrayOf,
  parseAsInteger,
  parseAsJson,
  parseAsString,
} from 'nuqs'

// ---- Custom parsers ----

/**
 * Comma-separated string array parser.
 * Reads: "headphones,dac" → ["headphones", "dac"]
 * Writes: ["headphones", "dac"] → "headphones,dac"
 */
const parseAsCommaSeparated = parseAsArrayOf(parseAsString, ',')

/**
 * Clamped budget parser. Validates budget URL params are within sensible bounds
 * instead of silently accepting `?b=-1` or `?b=999999999`.
 */
const BUDGET_MIN = 50
const BUDGET_MAX = 50000

const parseAsClampedBudget = createParser({
  parse(value: string): number | null {
    const n = parseInt(value, 10)
    if (!Number.isFinite(n)) return null
    if (n < BUDGET_MIN) {
      if (typeof window !== 'undefined') {
        console.warn(`[url-params] budget=${n} below min ${BUDGET_MIN}, clamping`)
      }
      return BUDGET_MIN
    }
    if (n > BUDGET_MAX) {
      if (typeof window !== 'undefined') {
        console.warn(`[url-params] budget=${n} above max ${BUDGET_MAX}, clamping`)
      }
      return BUDGET_MAX
    }
    return n
  },
  serialize(value: number): string {
    return String(value)
  },
})

/**
 * Boolean-keyed object parser for wantRecommendationsFor / existingGear.
 * Reads: "headphones,dac" → { headphones: true, dac: true, amp: false, combo: false }
 * Writes: { headphones: true, dac: true } → "headphones,dac"
 */
const EQUIPMENT_KEYS = ['headphones', 'dac', 'amp', 'combo'] as const
type EquipmentFlags = Record<(typeof EQUIPMENT_KEYS)[number], boolean>

function parseEquipmentFlags(value: string): EquipmentFlags | null {
  const keys = value.split(',').filter(Boolean)
  if (keys.length === 0) return null
  return {
    headphones: keys.includes('headphones'),
    dac: keys.includes('dac'),
    amp: keys.includes('amp'),
    combo: keys.includes('combo'),
  }
}

function serializeEquipmentFlags(flags: EquipmentFlags): string {
  return EQUIPMENT_KEYS.filter((k) => flags[k]).join(',')
}

const parseAsEquipmentFlags = createParser({
  parse: parseEquipmentFlags,
  serialize: serializeEquipmentFlags,
  eq: (a: EquipmentFlags, b: EquipmentFlags) =>
    EQUIPMENT_KEYS.every((k) => a[k] === b[k]),
})

/**
 * Gear models parser.
 * Reads: "headphones:HD650,dac:D90" → { headphones: "HD650", dac: "D90", amp: "", combo: "" }
 * Writes: { headphones: "HD650", dac: "D90" } → "headphones:HD650,dac:D90"
 */
type GearModels = Record<(typeof EQUIPMENT_KEYS)[number], string>

const parseAsGearModels = createParser({
  parse(value: string): GearModels | null {
    const models: GearModels = { headphones: '', dac: '', amp: '', combo: '' }
    value.split(',').forEach((entry) => {
      const colonIdx = entry.indexOf(':')
      if (colonIdx === -1) return
      const k = entry.slice(0, colonIdx)
      const v = entry.slice(colonIdx + 1)
      if (k && v && k in models) models[k as keyof GearModels] = v
    })
    return models
  },
  serialize(models: GearModels): string {
    return EQUIPMENT_KEYS
      .filter((k) => models[k])
      .map((k) => `${k}:${models[k]}`)
      .join(',')
  },
})

// ---- Defaults ----

export const PREF_DEFAULTS = {
  budget: 250,
  budgetRangeMin: 20,
  budgetRangeMax: 10,
  headphoneType: 'both',
  wantRecommendationsFor: {
    headphones: true,
    dac: false,
    amp: false,
    combo: false,
  } as EquipmentFlags,
  existingGear: {
    headphones: false,
    dac: false,
    amp: false,
    combo: false,
  } as EquipmentFlags,
  gearModels: {
    headphones: '',
    dac: '',
    amp: '',
    combo: '',
  } as GearModels,
  usage: 'music',
  usageRanking: [] as string[],
  excludedUsages: [] as string[],
  soundSignature: 'any',
  soundSignatures: ['neutral'] as string[],
  headphoneTypes: ['cans', 'iems'] as string[],
} as const

// ---- nuqs param schema ----
// Uses compact param names, with clearOnDefault to keep URLs clean.

export const recommendationParams = {
  b: parseAsClampedBudget.withDefault(PREF_DEFAULTS.budget).withOptions({
    clearOnDefault: true,
  }),
  budgetRangeMin: parseAsInteger
    .withDefault(PREF_DEFAULTS.budgetRangeMin)
    .withOptions({ clearOnDefault: true }),
  budgetRangeMax: parseAsInteger
    .withDefault(PREF_DEFAULTS.budgetRangeMax)
    .withOptions({ clearOnDefault: true }),
  type: parseAsString.withDefault(PREF_DEFAULTS.headphoneType).withOptions({
    clearOnDefault: true,
  }),
  want: parseAsEquipmentFlags.withDefault(PREF_DEFAULTS.wantRecommendationsFor).withOptions({
    clearOnDefault: true,
  }),
  gear: parseAsEquipmentFlags.withDefault(PREF_DEFAULTS.existingGear).withOptions({
    clearOnDefault: true,
  }),
  gearModels: parseAsGearModels.withDefault(PREF_DEFAULTS.gearModels),
  use: parseAsString.withDefault(PREF_DEFAULTS.usage).withOptions({
    clearOnDefault: true,
  }),
  ranked: parseAsCommaSeparated.withDefault([]).withOptions({
    clearOnDefault: true,
  }),
  exclude: parseAsCommaSeparated.withDefault([]).withOptions({
    clearOnDefault: true,
  }),
  soundSignature: parseAsString
    .withDefault(PREF_DEFAULTS.soundSignature)
    .withOptions({ clearOnDefault: true }),
  soundSignatures: parseAsJson<string[]>((v) =>
    Array.isArray(v) && v.every((x) => typeof x === 'string') ? v : null
  ).withDefault(PREF_DEFAULTS.soundSignatures as string[]),
  headphoneTypes: parseAsJson<string[]>((v) =>
    Array.isArray(v) && v.every((x) => typeof x === 'string') ? v : null
  ).withDefault(PREF_DEFAULTS.headphoneTypes as string[]),
  // Preserved params (not prefs, but kept across URL updates)
  source: parseAsString,
  experience: parseAsString,
}

export const serializeRecommendationParams = createSerializer(recommendationParams)

// ---- Legacy URL migration ----
// Reads legacy param names and returns compact equivalents.
// Used once on mount to migrate old URLs.

export function parseLegacyParams(
  searchParams: URLSearchParams
): Record<string, string> | null {
  const migrations: Record<string, string> = {}
  let hasLegacy = false

  // budget → b
  const budget = searchParams.get('budget')
  if (budget && !searchParams.has('b')) {
    migrations.b = budget
    hasLegacy = true
  }

  // headphoneType → type
  const headphoneType = searchParams.get('headphoneType')
  if (headphoneType && !searchParams.has('type')) {
    migrations.type = headphoneType
    hasLegacy = true
  }

  // usage → use
  const usage = searchParams.get('usage')
  if (usage && !searchParams.has('use')) {
    migrations.use = usage
    hasLegacy = true
  }

  // wantRecommendationsFor (JSON) → want (comma-separated)
  const wantJson = searchParams.get('wantRecommendationsFor')
  if (wantJson && !searchParams.has('want')) {
    try {
      const parsed = JSON.parse(wantJson)
      const keys = EQUIPMENT_KEYS.filter((k) => parsed[k])
      if (keys.length > 0) {
        migrations.want = keys.join(',')
        hasLegacy = true
      }
    } catch {
      // ignore
    }
  }

  // existingGear (JSON) → gear (comma-separated)
  const gearJson = searchParams.get('existingGear')
  if (gearJson && !searchParams.has('gear')) {
    try {
      const parsed = JSON.parse(gearJson)
      const keys = EQUIPMENT_KEYS.filter((k) => parsed[k])
      if (keys.length > 0) {
        migrations.gear = keys.join(',')
        hasLegacy = true
      }
    } catch {
      // ignore
    }
  }

  // usageRanking (JSON) → ranked (comma-separated)
  const rankingJson = searchParams.get('usageRanking')
  if (rankingJson && !searchParams.has('ranked')) {
    try {
      const parsed = JSON.parse(rankingJson)
      if (Array.isArray(parsed) && parsed.length > 0) {
        migrations.ranked = parsed.join(',')
        hasLegacy = true
      }
    } catch {
      // ignore
    }
  }

  // excludedUsages (JSON) → exclude (comma-separated)
  const excludeJson = searchParams.get('excludedUsages')
  if (excludeJson && !searchParams.has('exclude')) {
    try {
      const parsed = JSON.parse(excludeJson)
      if (Array.isArray(parsed) && parsed.length > 0) {
        migrations.exclude = parsed.join(',')
        hasLegacy = true
      }
    } catch {
      // ignore
    }
  }

  // Legacy single sound → soundSignatures
  const sound = searchParams.get('sound')
  if (sound && sound !== 'any' && !searchParams.has('soundSignatures')) {
    migrations.soundSignatures = JSON.stringify([sound])
    hasLegacy = true
  }

  return hasLegacy ? migrations : null
}

export type { EquipmentFlags, GearModels }
