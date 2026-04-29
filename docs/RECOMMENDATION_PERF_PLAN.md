# Recommendation Engine Performance — Audit & Optimization Plan

**Date:** 2026-04-16
**Triggered by:** "Recommendation engine loaded very slowly on staging."
**Testing note:** Staging is SSO-protected, so every anonymous curl was hitting Vercel's auth page (not the API). All timings below are against a **local prod build** (`npm run start` against the same Supabase DB). Prod/staging will differ only by network RTT and Vercel's routing overhead.

---

## Measured findings

### API latency (local prod, real)

| Endpoint | Cold p50 | Warm | Notes |
|---|---|---|---|
| `/api/recommendations/v2` | **330–620 ms** | **2–5 ms** | First-ever request: 2.25s (cache warm-up) |
| `/api/filters/counts` | **957 ms** | n/a | Returns 216 bytes — compute-bound, not data-bound |
| `/api/used-listings` (10 IDs) | 383 ms | n/a | Called only when marketplace section opens |

### Response sizes

- `/api/recommendations/v2` with 12 cans: **103 KB**
- **`fr_data` field alone is 8.2 KB per card → 98 KB of that 103 KB (95%)**
- Card UI never renders the FR chart inline — only in `ComponentDetailModal`. So it's 100 % over-fetch for most requests.

### DB query profile (EXPLAIN ANALYZE)

- Main `SELECT * FROM components WHERE category IN (...) ORDER BY price_used_min`: **69 ms exec + 45 ms planning = ~115 ms**. Seq scan (appropriate — 543 / 711 rows match). Pulls every column including `fr_data`.
- `get_active_listing_counts(component_ids)` RPC: **247 ms exec + 39 ms planning**. Bottleneck is four `NOT ILIKE '%sample%|%demo%'` filters on 10,154 used-listings rows — leading `%` makes them unindexable.
- `existingHeadphones` lookup (optional): one row ilike — fast.

### Bundle & client waterfall

- `.next/static/chunks`: **~2.8 MB JS + 140 KB CSS**. Largest: 354 KB × 2, 226 KB, 191 KB, 137 KB.
- `/recommendations` initial HTML: 33 KB, references 14 JS chunks + 3 CSS files.
- Client fetches on mount: `/api/recommendations/v2` and `/api/filters/counts` (parallel via `useEffect`). Optional `/api/used-listings` and `/api/components?ids=...` on interaction.

### Cache semantics

- Responses ship `Cache-Control: no-store, max-age=0` → Vercel CDN never caches. Every request hits origin.
- Next.js `unstable_cache` (server-side data cache) works and serves the 2–5 ms warm hits.
- My recent cache-key fix (commit `91c1d8e`) legitimately expanded the key space — more cache misses is correctness, not a regression, but amplifies the cold-path pain below.

---

## Root causes, ranked by impact

### Tier 1 — ship these first (targets ~80 % of perceived slowness)

#### 1.1 Stop selecting `fr_data` on the main rec query — **biggest single win**
- **File:** `src/app/api/recommendations/v2/route.ts:1048-1052` (`.from("components").select("*")`)
- **Fix:** enumerate the columns the card + scoring actually need. Drop `fr_data` (and audit for other heavy fields — `crinacle_comments` is moderate, `technical_specs` JSONB worth checking).
- **Fetch FR on-demand** when the detail modal opens (likely already a separate endpoint — verify `/api/components/[id]/price-history` et al).
- **Expected impact:** response size 103 KB → ~5 KB (95 % reduction). DB row-width drops, JSON encode/decode faster, transport faster, client parse faster. Should shave 100-200ms off cold TTFB and way more on slow networks.
- **Risk:** low — if any card field is accidentally omitted, it's one edit away. Add a unit test snapshot of response shape.
- **Effort:** ~2 hr

#### 1.2 Kill the unindexable ILIKE in `get_active_listing_counts`
- **File:** DB function + `used_listings` schema (new migration)
- **Fix:** add `is_sample BOOLEAN NOT NULL DEFAULT false` column; backfill via a one-time update using the current ILIKE pattern; update the two scraper insert paths (Reverb + Reddit) to set it at write time; replace the four ILIKE clauses in `get_active_listing_counts` with `AND NOT is_sample`. Add partial index `WHERE is_sample = false`.
- **Expected impact:** RPC 247 ms → ~20 ms (10× faster). Cumulative with 1.1, cold API should land near 100–150ms.
- **Risk:** low-medium — needs migration + scraper update + backfill. Validate backfill count matches ILIKE count before switching the RPC.
- **Effort:** ~3 hr

#### 1.3 Investigate why `/api/filters/counts` is 957 ms
- **File:** `src/app/api/filters/counts/route.ts`
- **Fix:** read the implementation — probable cause is sequential COUNT queries per filter value. Batch into a single grouped query, or precompute into the recs response (since both endpoints need the same underlying rows).
- **Expected impact:** either cut to <100 ms or merge into the recs call and delete the endpoint.
- **Risk:** low
- **Effort:** ~2 hr

#### 1.4 Add CDN-friendly `Cache-Control` for anonymous canonical queries
- **File:** `src/app/api/recommendations/v2/route.ts` response headers
- **Fix:** when the request has no personalization inputs (`selectedItems`, `customBudgetAllocation`, `existingHeadphones`, authenticated user), send `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`. Vercel's edge network serves the same param-set from the closest POP instead of round-tripping to origin.
- **Expected impact:** repeat traffic from the same region drops from 300-600ms to <50ms. First-visit-per-region still pays origin cost.
- **Risk:** medium — must guarantee the response has zero user-specific content before caching. Unit-test the guard.
- **Effort:** ~1 hr

### Tier 2 — measurable but smaller wins

#### 2.1 Bundle audit + dynamic imports
- Run `npm run analyze:bundle` (Turbopack analyzer I wired up earlier) and identify bloat. Common culprits: `framer-motion` (~80 KB gz), `recharts` (~100 KB gz when eagerly imported), full `lucide-react` barrel imports.
- `recommendations-content.tsx` already dynamic-imports modals — good. Audit `HeadphoneCard` / `SignalGearCard` for heavy dependencies loaded on every card.
- **Expected:** -100-300 KB from initial JS, -100-300 ms on 4G.

#### 2.2 First-request cold-start (2.25 s → <500 ms)
- Current 2.25 s first request is Next serverless warm-up + Supabase connection pool init + `unstable_cache` first miss. Options: Vercel cron to poke a warm-up route every 5 min; or try `export const runtime = 'nodejs'` with explicit connection reuse; or experimental `runtime = 'edge'` if Supabase edge client is compatible.

#### 2.3 Preconnect hints
- Add `<link rel="preconnect">` for Supabase and the image CDN in the root layout. Saves one DNS+TLS on cold page load.

### Tier 3 — structural bets (only if Tiers 1-2 don't clear the bar)

- **3.1** Materialized view for active listing counts, refreshed on insert/update. Eliminates the RPC entirely.
- **3.2** Streaming server components for `/recommendations` — stream cans first, then IEMs/DACs/amps, so first card paints before the full payload arrives.
- **3.3** Edge runtime for the API route (requires Supabase edge client validation).

---

## Explicitly not doing

- **Swap Supabase JS for raw `pg`** — latency is dominated by query shape, not client overhead.
- **Redis in front of `unstable_cache`** — 2-5ms warm hits are already great; the problem is cold-misses, which Redis doesn't fix.
- **Global React Query refactor** — the page-level waterfall has 2 parallel fetches, not a cascade. Not the bottleneck.

---

## Critical files

- `src/app/api/recommendations/v2/route.ts` — main engine (1.1, 1.4, 2.2)
- `src/app/api/filters/counts/route.ts` — second-worst endpoint (1.3)
- `supabase/migrations/*` — new migration for `is_sample` (1.2)
- DB function `get_active_listing_counts` — RPC edit (1.2)
- Scrapers that write to `used_listings`: `scripts/reverb-integration.js`, `scripts/reddit-avexchange-scraper-v3.js` (1.2)
- `src/app/recommendations/recommendations-content.tsx` — client fetches (1.3 merge, 2.1)

---

## Verification plan

Run after each Tier 1 item:

```bash
# 1. API cold / warm timing
for b in 287 312 349 441 573 798; do
  curl -sS -o /dev/null -w "budget=$b ttfb=%{time_starttransfer}s size=%{size_download}B\n" \
    "http://localhost:3457/api/recommendations/v2?budget=$b&soundSignatures=%5B%22neutral%22%5D&headphoneType=cans&wantRecommendationsFor=%7B%22headphones%22%3Atrue%7D"
done

# 2. Response-size breakdown
curl -sS $URL | python3 -c "import json,sys;d=json.load(sys.stdin);print(sum(len(json.dumps(i)) for i in d.get('cans',[])))"

# 3. DB profile
npm run db -- -f tasks/explain-queries.sql
```

**Targets after Tier 1:**
- `/api/recommendations/v2` cold p50 **< 150 ms**
- Response payload **< 15 KB** (12 cards)
- `/api/filters/counts` cold **< 100 ms** (or endpoint deleted)
- Vercel CDN hit-rate on anon queries **> 70 %** after 1.4 ships

**Targets after Tier 2:**
- Lighthouse performance **> 90** on `/recommendations`
- Time-to-interactive on simulated 4G **< 1.5 s**
