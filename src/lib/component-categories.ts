/**
 * Canonical component categories and the groupings built on them.
 *
 * The DB `components.category` enum is the source of truth:
 *   cans | iems | dac | amp | dac_amp | cable
 *
 * Several modules had independently drifted to plural/legacy spellings
 * ('headphones', 'amps', 'dacs', 'combo'). Those string comparisons silently
 * matched nothing, which disabled stack compatibility warnings and gear
 * upgrade suggestions without any error. Import from here instead of writing
 * category literals inline.
 */

export const CATEGORY = {
  CANS: 'cans',
  IEMS: 'iems',
  DAC: 'dac',
  AMP: 'amp',
  DAC_AMP: 'dac_amp',
  CABLE: 'cable',
} as const;

export type ComponentCategory = (typeof CATEGORY)[keyof typeof CATEGORY];

/** Anything worn on the head — the things that have a sound signature. */
export const HEADPHONE_CATEGORIES: readonly string[] = [CATEGORY.CANS, CATEGORY.IEMS];

/** Anything that can amplify. */
export const AMP_CATEGORIES: readonly string[] = [CATEGORY.AMP, CATEGORY.DAC_AMP];

/** Anything that can do digital-to-analog conversion. */
export const DAC_CATEGORIES: readonly string[] = [CATEGORY.DAC, CATEGORY.DAC_AMP];

/** Source/signal gear, as opposed to transducers. */
export const SIGNAL_CATEGORIES: readonly string[] = [
  CATEGORY.DAC,
  CATEGORY.AMP,
  CATEGORY.DAC_AMP,
];

/**
 * Legacy and user-entered spellings seen in `user_gear.custom_category` and in
 * older code paths. Maps onto the canonical enum.
 */
const CATEGORY_ALIASES: Record<string, ComponentCategory> = {
  headphones: CATEGORY.CANS,
  headphone: CATEGORY.CANS,
  cans: CATEGORY.CANS,
  iem: CATEGORY.IEMS,
  iems: CATEGORY.IEMS,
  dac: CATEGORY.DAC,
  dacs: CATEGORY.DAC,
  amp: CATEGORY.AMP,
  amps: CATEGORY.AMP,
  amplifier: CATEGORY.AMP,
  combo: CATEGORY.DAC_AMP,
  dac_amp: CATEGORY.DAC_AMP,
  'dac/amp': CATEGORY.DAC_AMP,
  cable: CATEGORY.CABLE,
  cables: CATEGORY.CABLE,
};

/**
 * Normalize a possibly-legacy category string to the canonical enum.
 *
 * @returns the canonical category, or null if unrecognized.
 */
export function normalizeCategory(category: string | null | undefined): ComponentCategory | null {
  if (!category) return null;
  return CATEGORY_ALIASES[category.trim().toLowerCase()] ?? null;
}

/** Does this (possibly legacy-spelled) category belong to the given group? */
export function isCategoryIn(
  category: string | null | undefined,
  group: readonly string[]
): boolean {
  const normalized = normalizeCategory(category);
  return normalized != null && group.includes(normalized);
}
