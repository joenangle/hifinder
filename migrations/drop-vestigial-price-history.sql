-- Drop the vestigial price_history table and its indexes.
--
-- Context (as of 2026-04-20):
--   * Writer:  scripts/aggregate-market-prices.js — exists, but is NOT
--     scheduled anywhere (no cron, no workflow). Last populated the table
--     in a one-off manual run on 2026-03-06. 80 rows since then.
--   * Reader:  zero usages in src/. The API route
--     /api/components/[id]/price-history queries used_listings directly
--     and does its own aggregation — it doesn't read this table.
--   * Live trend data lives in price_trends (517 rows, weekly updates),
--     which is what the recommendation engine's price-trend reranking
--     uses (see commit 2a50366).
--
-- Apply order (after this migration lands):
--   1. Delete scripts/aggregate-market-prices.js
--   2. Remove these package.json scripts:
--        "scrape:market-prices"
--        "scrape:market-prices:execute"
--
-- Idempotent: safe to re-run. IF EXISTS on every drop.

BEGIN;

DROP INDEX IF EXISTS idx_price_history_component;
DROP TABLE IF EXISTS public.price_history;

COMMIT;

-- Verify the table is gone:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name = 'price_history';
--   -- Expect: 0 rows
