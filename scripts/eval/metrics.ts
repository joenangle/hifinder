/**
 * Pure ranking-quality metrics. No I/O — unit-testable in isolation.
 *
 * Relevance grades are integers 0–3 (0 = irrelevant, 3 = ideal). Graded DCG
 * uses the standard 2^rel − 1 gain so a grade-3 item is worth much more than
 * three grade-1 items, which matches "one great pick beats several mediocre ones".
 */

/** Discounted cumulative gain over the first k items of a ranked list. */
export function dcgAtK(rankedRelevances: number[], k: number): number {
  let dcg = 0
  const limit = Math.min(k, rankedRelevances.length)
  for (let i = 0; i < limit; i++) {
    // i is 0-indexed; discount is log2(rank+1) = log2((i+1)+1).
    dcg += (Math.pow(2, rankedRelevances[i]) - 1) / Math.log2(i + 2)
  }
  return dcg
}

/**
 * Normalized DCG@k: DCG of the actual ordering divided by the DCG of the best
 * possible ordering of the same graded set. 1.0 = perfect ordering, 0 = no
 * relevant items present. Returns 0 when there is nothing relevant to rank.
 */
export function ndcgAtK(rankedRelevances: number[], k: number): number {
  const dcg = dcgAtK(rankedRelevances, k)
  const ideal = [...rankedRelevances].sort((a, b) => b - a)
  const idcg = dcgAtK(ideal, k)
  return idcg === 0 ? 0 : dcg / idcg
}

/**
 * Precision@k: fraction of the top-k that clears a relevance threshold
 * (default ≥ 2, i.e. "good" or "ideal"). Denominator is min(k, length) so a
 * category with fewer than k eligible items isn't punished for being thin.
 */
export function precisionAtK(
  rankedRelevances: number[],
  k: number,
  threshold = 2
): number {
  const top = rankedRelevances.slice(0, k)
  if (top.length === 0) return 0
  const hits = top.filter((r) => r >= threshold).length
  return hits / top.length
}
