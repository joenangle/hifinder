# Claude Code Notes for HiFinder

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
- Usage-to-sound-signature mappings: Current auto-mappings are simplified, consider follow-up questions
- SINAD gaps: ~100 electronics still missing, many lack ASR reviews or have model version mismatches
- Image gaps: ~136 electronics still missing images — run `npm run scrape:images:execute -- --category dac,amp,dac_amp`
- See `memory/feature-plans.md` for deferred features (NL search, sound filtering)

## Key Scripts
```bash
npm run db "SELECT ..."                           # Direct SQL queries
npm run db:types                                  # Regenerate Supabase TS types
npm run scrape:reddit                             # V3 Reddit scraper
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
