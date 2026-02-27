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

## Active To-Dos
- eBay Campaign ID: Once approved, add `NEXT_PUBLIC_EBAY_CAMPAIGN_ID` to Vercel env vars
- Usage-to-sound-signature mappings: Current auto-mappings are simplified, consider follow-up questions
- Summit-fi data gaps: Need 15-25 more high-end DACs, amps, combos (>$500)
- See `memory/feature-plans.md` for deferred features (used listings page, NL search, nuqs)

## Key Scripts
```bash
npm run scrape:reddit              # V3 Reddit scraper
npm run build:analyze              # CSS size monitoring
node scripts/detect-all-duplicates.js  # Quarterly duplicate check
node scripts/merge-crinacle-cans.js data.csv --execute  # Expert data import
```

## Reference (in memory files)
- `memory/scrapers-and-data-sources.md` — Reddit, Reverb, eBay details
- `memory/database-procedures.md` — Sound signatures, expert data import, duplicate detection
- `memory/feature-plans.md` — Deferred features (used listings, NL search, sound filtering)
- `memory/completed-work.md` — History of completed features and optimizations

## GitHub Actions Secrets
- `VERCEL_TOKEN`: Vercel personal access token
- `VERCEL_ORG_ID`: `joenangles-projects`
- Workflow: `.github/workflows/staging-alias.yml`
