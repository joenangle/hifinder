# Scripts Archive

This directory contains old utility scripts that have been archived for historical reference.

## Directory Structure

### `migrations/`
One-time database migrations and schema changes that have already been applied to production.
- Column additions (add-*-column.js)
- Table creation (create-*-table.sql)
- RLS policy updates (fix-*-rls.js)
- Schema updates (update-schema.*)

### `tests/`
Old test and analysis scripts used during development.
- API endpoint tests (test-*.js)
- Data analysis (analyze-*.js)
- Schema checks (check-*.js)
- Verification scripts (verify-*.js)

### `data-population/`
One-time scripts used to populate the database with initial data.
- Component imports (add-comprehensive-*.js)
- Data population (populate-*.js)
- Admin utilities (admin-*.js)

### `old-duplicates/`
Obsolete duplicate detection scripts superseded by detect-all-duplicates.js
- detect-duplicates.js (old version)
- detect-duplicates-improved.js (intermediate version)
- fix-spacing-duplicates.js (one-time fix)
- fix-sundara-duplicates.js (one-time fix)

## Active Scripts (in parent directory)

The following scripts remain active in `/scripts`:
- `reddit-avexchange-scraper.js` - Reddit used listings scraper
- `unified-listing-aggregator.js` - Multi-source listing aggregator
- `headfi-scraper.js` - Head-Fi classifieds scraper
- `reverb-integration.js` - Reverb marketplace integration
- `merge-crinacle-cans.js` - Expert data merger
- `detect-all-duplicates.js` - Current duplicate detection
- `auto-remove-duplicates.js` - Automated duplicate removal
- `component-matcher.js` - Fuzzy matching utility
- `import-crinacle-data.js` - Expert data importer
- `listing-scheduler.js` - Automated scraping scheduler

## Notes

These archived scripts are kept for reference but should not be run against production.
Many reference database schemas or configurations that no longer exist.
