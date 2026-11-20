/**
 * Which owned headphones the recommendations page sends as `ownedHeadphoneIds`.
 *
 * The route sizes amps for the hardest to drive of whatever it receives
 * (`pickHardestToDrive`), so the page controls the match just by choosing what
 * to send. No route change is needed.
 *
 * The choice lives in the `match` URL param:
 * - absent (null): automatic. Send every owned headphone and let the route pick.
 * - `AMP_MATCH_NONE`: rank amps without reference to any headphone.
 * - a catalog ID: match to that headphone only.
 */
export const AMP_MATCH_NONE = 'none'

export type AmpMatchChoice = string | null

export function resolveAmpMatchIds(ownedIds: string[], choice: AmpMatchChoice): string[] {
  if (choice === AMP_MATCH_NONE) return []
  // A pick the user no longer owns (removed gear, a shared link, signed out)
  // falls back to automatic. The dropdown shows what the API actually matched,
  // so the fallback is visible rather than silent.
  if (choice !== null && ownedIds.includes(choice)) return [choice]
  return ownedIds
}
