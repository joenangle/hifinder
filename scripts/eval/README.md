# Recommendation ranking evaluation

Measures the quality of `filterAndScoreComponents` (the recommendation ranker)
so scoring changes are validated empirically instead of by eyeballing.

## Usage

```bash
npm run eval:reco                          # human-readable scorecard (nDCG@5, precision@5)
npm run eval:reco -- --json > new.json     # machine-readable scorecard
npm run eval:reco -- --baseline old.json   # scorecard + delta column vs a saved run
```

The `--json` output of one revision is the `--baseline` input for the next, so a
scoring change prints a delta table.

## Files

- `../eval-recommendations.ts` — orchestrator: loads the catalogue, runs the ranker
  per scenario, grades relevance, prints nDCG@5 / precision@5.
- `fixtures.ts` — scenarios + relevance-label mechanism (see the header there).
- `metrics.ts` — pure nDCG / precision (unit-testable).
- `load-env.ts` — loads `.env.local` before the ranker chain imports it.
- `baseline.json` — **v3.4 pre-refactor reference** (before the ceiling/synergy work).
  Run with `--baseline scripts/eval/baseline.json` to see cumulative movement since then.

## Relevance labels — important caveat

Each returned item is graded 0–3 by a hand-curated `gold` label when present,
otherwise by a **proxy** = 0.6·expert-quality + 0.4·signature-fit that deliberately
**excludes price**. This makes the metric valid for judging price-model, synergy,
and ranking-order changes (it detects when those displace genuinely good gear). It
is **not** a valid judge of changes to the expert or signature sub-scores themselves
— that would be circular. Extend `gold` in `fixtures.ts` (with models you've verified
in the catalogue) to harden the metric for those cases.
