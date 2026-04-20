/**
 * Derive 1-2 short "why this was recommended" chips for a rec card.
 *
 * Rule-based (not LLM): given the score decomposition already computed by
 * the scoring engine + expert grades on the component, pick the most
 * informative reasons to surface on the card. Deterministic, fast, zero
 * dependencies.
 *
 * Scope contract: the chips are *supplementary* to the existing champion
 * badges ("Top Tech", "Best Match", "Best Value") which appear only on
 * the strongest cards. Chips apply to *every* card and explain why each
 * one earned its match score.
 */

export interface ReasonChipInput {
  matchScore?: number
  expertScoreDisplay?: number
  signatureScoreDisplay?: number
  valueScore?: number
  proximityScoreDisplay?: number
  liquidityBonusDisplay?: number
  crin_tone?: string | null
  crin_tech?: string | null
  asr_sinad?: number | null
  usedListingsCount?: number
  /** True when the component lacks sufficient expert data and was
   *  down-weighted. Surfaced as a cautionary chip. */
  hasThinExpertData?: boolean
}

export interface ReasonChip {
  label: string
  /** Longer text for title / aria-label. */
  tooltip: string
  /** Semantic tag for styling — keep the palette small. */
  tone: 'expert' | 'signature' | 'value' | 'liquidity' | 'match' | 'caution'
}

const TOP_GRADES = new Set(['S+', 'S', 'S-', 'A+', 'A'])

function isTopGrade(grade?: string | null): boolean {
  return !!grade && TOP_GRADES.has(grade)
}

/**
 * Returns up to `max` chips, ordered by informativeness.
 */
export function deriveReasonChips(
  comp: ReasonChipInput,
  max: number = 2
): ReasonChip[] {
  const chips: ReasonChip[] = []

  // 1. Expert-rated — strongest trust signal when present.
  //    Distinguish top-tier (both tone+tech A or better) from generic "rated".
  const hasTone = isTopGrade(comp.crin_tone)
  const hasTech = isTopGrade(comp.crin_tech)
  if (hasTone && hasTech) {
    chips.push({
      label: 'Top-tier expert grade',
      tooltip: `Crinacle tuning ${comp.crin_tone}, technical ${comp.crin_tech}`,
      tone: 'expert',
    })
  } else if (comp.asr_sinad && comp.asr_sinad >= 100) {
    chips.push({
      label: 'ASR-validated',
      tooltip: `Measured SINAD ${comp.asr_sinad} dB (ASR)`,
      tone: 'expert',
    })
  }

  // 2. Value pick — well under budget AND scoring at least decently.
  //    Requires both (just cheap isn't interesting; cheap + good is).
  if ((comp.valueScore ?? 0) >= 85 && (comp.expertScoreDisplay ?? 0) >= 60) {
    chips.push({
      label: 'Strong value',
      tooltip: 'Well under budget for this performance tier',
      tone: 'value',
    })
  }

  // 3. Signature match — only worth surfacing if clearly aligned.
  //    sigScore is 0-50 range in the scoring code; >= 40 ≈ strong match.
  if ((comp.signatureScoreDisplay ?? 0) >= 40) {
    chips.push({
      label: 'Matches your sound',
      tooltip: 'Sound signature aligns with your preferences',
      tone: 'signature',
    })
  }

  // 4. Available used — actionable today.
  const listings = comp.usedListingsCount ?? 0
  if (listings >= 3) {
    chips.push({
      label: `${listings} used available`,
      tooltip: `${listings} active listings across tracked marketplaces`,
      tone: 'liquidity',
    })
  }

  // 5. Near-perfect match — catch-all when nothing else fired but the
  //    headline score is strong (e.g. synergy of many small bonuses).
  if (chips.length === 0 && (comp.matchScore ?? 0) >= 85) {
    chips.push({
      label: 'Top match for your query',
      tooltip: `${comp.matchScore}% overall match`,
      tone: 'match',
    })
  }

  // 6. Limited expert data — pinned to the front so users always see the
  //    caveat when it applies (can displace other chips under the cap).
  if (comp.hasThinExpertData) {
    chips.unshift({
      label: 'Limited data',
      tooltip:
        'This rec has thin or no expert grades / SINAD measurements. Score is best-effort — verify before buying.',
      tone: 'caution',
    })
  }

  return chips.slice(0, max)
}

export const REASON_CHIP_CLASSES: Record<ReasonChip['tone'], string> = {
  expert:
    'border-amber-300/70 bg-amber-50 text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200',
  signature:
    'border-sky-300/70 bg-sky-50 text-sky-900 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-200',
  value:
    'border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-200',
  liquidity:
    'border-violet-300/70 bg-violet-50 text-violet-900 dark:border-violet-700/60 dark:bg-violet-950/40 dark:text-violet-200',
  match:
    'border-subtle bg-secondary text-secondary',
  caution:
    'border-slate-300/70 bg-slate-50 text-slate-600 dark:border-slate-600/60 dark:bg-slate-900/40 dark:text-slate-300',
}
