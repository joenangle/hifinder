/**
 * Combined amp+dac sub-budget (USD) at or below which amplification is served
 * by a single portable dac_amp combo instead of separate desktop gear.
 *
 * Rationale: the portable dac_amp roster spans ~$9–$140; pure `amp` rows start
 * at $64 with a $389 median, and a bare amp still needs a separate DAC — so at
 * this tier a combo strictly dominates. Keyed on the amplification sub-budget
 * (not the total) so "headphones+amp @ $600" (amp ≈ $171) stays desktop while
 * "$300 headphones+dac+amp" (dac+amp ≈ $132) collapses to one combo.
 * Tunable: raise toward ~$200 to reach the FiiO K7 / Schiit Hel tier as a combo.
 */
export const PORTABLE_COMBO_CEILING = 150

export type AmplificationStrategy =
  | { mode: 'separate' }
  | { mode: 'combo'; reason: 'explicit' | 'budget' }

/**
 * Decide how to satisfy an amplification request. Pure — no I/O.
 * `ampAllocation`/`dacAllocation` are the dollars the budget allocator assigned
 * to those slots (0 when not requested or redistributed away).
 */
export function resolveAmplificationStrategy(input: {
  wants: { dac: boolean; amp: boolean; combo: boolean }
  ampAllocation: number
  dacAllocation: number
}): AmplificationStrategy {
  const { wants, ampAllocation, dacAllocation } = input

  if (wants.combo) return { mode: 'combo', reason: 'explicit' }
  if (!wants.amp && !wants.dac) return { mode: 'separate' }

  const amplificationBudget =
    (wants.amp ? ampAllocation : 0) + (wants.dac ? dacAllocation : 0)

  return amplificationBudget <= PORTABLE_COMBO_CEILING
    ? { mode: 'combo', reason: 'budget' }
    : { mode: 'separate' }
}
