/**
 * Free-text search terms for PostgREST `.or()` filters.
 *
 * Search words are interpolated into filter strings like
 * `brand.ilike.%word%,name.ilike.%word%`. A raw `,` starts a new clause and a
 * `(`/`)` can close the group, so unsanitized input could add arbitrary
 * filters. `"` and `\` are PostgREST's quoting syntax, and `%`, `_` and `*`
 * (PostgREST's alias for `%`) are ilike wildcards. None of these matter when
 * matching gear names, so they are treated as word separators.
 */
const FILTER_SYNTAX_CHARS = /[,()"\\%_*]/g

export function searchWords(q: string | null | undefined): string[] {
  if (!q) return []
  return q.replace(FILTER_SYNTAX_CHARS, ' ').trim().toLowerCase().split(/\s+/).filter(Boolean)
}

/** `.or()` clause matching a sanitized word in either brand or name. */
export function brandOrNameMatches(word: string): string {
  return `brand.ilike.%${word}%,name.ilike.%${word}%`
}
