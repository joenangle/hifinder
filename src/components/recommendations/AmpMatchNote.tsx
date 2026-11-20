'use client'

import { AMP_MATCH_NONE, type AmpMatchChoice } from '@/lib/amp-match'

export interface OwnedHeadphoneOption {
  id: string
  brand: string
  name: string
}

interface AmpMatchNoteProps {
  /** Headphones the user owns: their collection plus any marked owned on the page. */
  options: OwnedHeadphoneOption[]
  /** The headphone the API actually matched to, or null when it matched none. */
  matchedTo: OwnedHeadphoneOption | null
  choice: AmpMatchChoice
  onChange: (choice: AmpMatchChoice) => void
}

/**
 * Says which owned headphone the amp ranking is sized for, what that does,
 * and lets the user pick another one or turn matching off.
 */
export function AmpMatchNote({ options, matchedTo, choice, onChange }: AmpMatchNoteProps) {
  if (options.length === 0) return null

  const off = choice === AMP_MATCH_NONE
  const value = off ? AMP_MATCH_NONE : (matchedTo?.id ?? '')
  const automatic = choice === null && options.length > 1

  return (
    <div className="mt-1 text-xs text-secondary">
      <label className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0">Matched to</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 max-w-[16rem] truncate rounded border border-subtle bg-surface px-1.5 py-0.5 text-xs text-primary"
        >
          {value === '' && <option value="" disabled>…</option>}
          {options.map((h) => (
            <option key={h.id} value={h.id}>
              Your {h.brand} {h.name}
            </option>
          ))}
          <option value={AMP_MATCH_NONE}>No specific headphones</option>
        </select>
      </label>
      <p className="mt-0.5 text-tertiary">
        {off
          ? 'Ranked without your headphones, so cards show no pairing verdict.'
          : `Amps with enough power for ${matchedTo ? 'it' : 'them'} rank a little higher and show a pairing verdict.${
              automatic ? ` Picked as the hardest to drive of your ${options.length}.` : ''
            }`}
      </p>
    </div>
  )
}
