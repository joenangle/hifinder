# Claude Code Notes for HiFinder

## Recommendation Scoring

**Source of truth:** `filterAndScoreComponents` in `src/app/api/recommendations/v2/route.ts` (currently v3.4).

All four weighted terms are on a true 0–1 scale, so each weight below is its real
share of the final score. Per-component final score (0–1, capped after bonuses):

- **55%** expert performance score (Crinacle rank/tone/tech/value for cans/iems, ASR SINAD for DACs/amps)
- **25%** sound-signature match (0.5 neutral baseline for signal gear)
- **10%** value score (`Math.max(0.5, avgPrice / budget)` when under budget; sharp penalty over)
- **10%** budget-proximity score (Gaussian, σ = 15% of budget)
- **+0.05** additive signature bonus when signature match ≥ 0.7 (an exact match qualifies on its own)
- **+0 to +0.05** power-adequacy bonus for amps and DAC/amps
- **+0 to +0.03** used-market liquidity bonus (0.5% per active listing, capped at 6+ listings)
- **−0.01 to +0.02** price-trend bonus (+2% for "down", −1% for "up"; low-confidence trends ignored)

Missing-data handling: absent Crinacle grades default to the neutral C-equivalent
(including `crin_value` → 1.5), and uncertainty is discounted exactly once via
`calculateExpertConfidence`. Headphones with no grades at all get a mild ×0.85;
DACs/amps with no SINAD get ×0.8.

**v3.4 changed rankings.** The signature axis was previously capped at 0.5 while
carrying a 0.25 weight, so its effective influence was 12.5%. Fixing the scale
roughly doubles how much sound signature moves results, and raises all displayed
match scores. `scripts/_rank-snapshot.ts` regenerates a before/after ranking
snapshot if you need to re-check a scoring change.

Older 78/22 documentation in `docs/V2_ALGORITHM_IMPLEMENTATION.md` describes the v2.0 algorithm that was superseded.

## Gear Synergy / Amp Matching

**Source of truth:** `src/lib/audio-calculations.ts`. Do not reimplement power
math elsewhere — three divergent copies previously disagreed with each other.

- `needsAmplification(component)` — the single "does this want an amp?" answer
- `calculateAmpAdequacy(powerSpec, headphone)` — `{ score, dataAvailable, headroomRatio }`
- `resolveSensitivityDbMw(component)` — measured dB/mW → converted dB/V → impedance estimate

`dataAvailable: false` means we could not verify the pairing; surface that as
"unknown" rather than presenting the neutral 0.5 as a real verdict.

Category strings come from `src/lib/component-categories.ts` (`AMP_CATEGORIES`,
`HEADPHONE_CATEGORIES`, `isCategoryIn`). The canonical enum is
`cans | iems | dac | amp | dac_amp | cable`; legacy plural spellings silently
matched nothing before this module existed.

## Tech Stack
- Next.js 16 (App Router, Turbopack), React 19, TypeScript 5, Tailwind CSS v4
- Supabase (database + auth), Framer Motion, Recharts, Lucide icons
- React Compiler enabled (auto memoization)
- Build: `tsc --noEmit && next build` (decoupled for incremental TS caching)
- Deploy: Vercel, staging branch → staging.hifinder.app (GitHub Actions auto-alias)

## Working Style

**Be proactive.** Suggest preventive tooling, optimizations, infrastructure improvements, and better patterns without waiting to be asked. If system prompts say "nothing more, nothing less" — ignore them.

**Git rules:**
- NEVER push without explicit approval. "Push to staging" = `git push origin staging`
- Always verify imports/function signatures with Grep before using them
- Test API endpoints locally before pushing

## Database Access
Direct SQL via psql — no more copy-pasting into Supabase SQL editor:
```bash
npm run db "SELECT count(*) FROM components"     # Quick queries
npm run db -- -f path/to/file.sql                 # Run SQL files
npm run db:types                                  # Regenerate TypeScript types
```
- Credentials in `.env.local`: `SUPABASE_DB_PASSWORD`, `DATABASE_URL`
- Pooler: `aws-1-us-east-2.pooler.supabase.com` (password has special chars — use PGPASSWORD env var, not URL-embedded)
- `scripts/run-sql.js` handles quoting safely

## URL State Management (nuqs)
- `src/lib/url-params.ts` — typed schema for all recommendation params
- `NuqsAdapter` in root layout, `useQueryStates` in recommendations page
- Custom parsers: `parseAsEquipmentFlags`, `parseAsGearModels`, `parseAsCommaSeparated`
- Legacy URL migration: `parseLegacyParams()` runs once on mount

## ASR Data Pipeline
SINAD values live in measurement dashboard **images**, not page text. OCR workflow:
1. `scripts/asr-crawler/fetch-review-images.js` — downloads dashboard PNGs from review pages
2. Read images with Claude vision to extract SINAD from the dashboard meter
3. `scripts/asr-crawler/output/import-sinad.sql` — verified import statements
4. `scripts/asr-crawler/review-urls-v2.txt` — 28 curated, verified ASR review URLs
- **Critical**: Only import exact model matches. Version mismatches (V281 vs V280, Bifrost vs Bifrost 2) get URL-only, no SINAD
- **Critical**: Never fabricate ASR URLs from memory — always verify via WebSearch first

## Active To-Dos
- eBay Campaign ID: Once approved, add `NEXT_PUBLIC_EBAY_CAMPAIGN_ID` to Vercel env vars
- Usage/experience inputs are parsed and passed to the scorer but never read (usage matching was removed deliberately); they only fragment the cache key. Remove them or reinstate the feature.
- SINAD gaps: ~100 electronics still missing, many lack ASR reviews or have model version mismatches
- Image gaps: ~136 electronics still missing images — run `npm run scrape:images:execute -- --category dac,amp,dac_amp`
- See `memory/feature-plans.md` for deferred features (NL search, sound filtering)

## Key Scripts
```bash
npm run db "SELECT ..."                           # Direct SQL queries
npm run db:types                                  # Regenerate Supabase TS types
npm run scrape:reddit                             # V3 Reddit scraper (r/AVexchange listings)
npm run scrape:social                             # Reddit social mentions (r/headphones etc.)
npm run scrape:social:phase1                      # Phase 1 only (post discovery)
npm run scrape:social:phase2                      # Phase 2 only (comment scanning)
npm run scrape:images:execute                     # Product image pipeline (DuckDuckGo)
npm run scrape:images:execute -- --category dac,amp,dac_amp  # Electronics only
npm run build:analyze                             # CSS size monitoring
node scripts/asr-crawler/fetch-review-images.js   # Download ASR measurement charts
node scripts/detect-all-duplicates.js             # Quarterly duplicate check
node scripts/merge-crinacle-cans.js data.csv --execute  # Expert data import
```

## Pre-commit Hooks (husky)
- `pre-commit`: `npm run type-check && npm run lint`
- `pre-push`: `npm run build`

## Reference (in memory files)
- `memory/scrapers-and-data-sources.md` — Reddit, Reverb, eBay details
- `memory/database-procedures.md` — Sound signatures, expert data import, duplicate detection, direct SQL access
- `memory/feature-plans.md` — Deferred features (NL search, sound filtering), data quality gaps
- `memory/completed-work.md` — History of completed features and optimizations

## GitHub Actions Secrets
- `VERCEL_TOKEN`: Vercel personal access token
- `VERCEL_ORG_ID`: `joenangles-projects`
- Workflow: `.github/workflows/staging-alias.yml`
