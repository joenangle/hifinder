# HiFinder Documentation

This directory contains implementation guides, setup instructions, and historical analysis documents.

## Implementation Guides

Active documentation for implementing features and integrations:

- **ADMIN_DASHBOARD_SETUP.md** - Admin dashboard configuration
- **EBAY_AFFILIATE_STRATEGY.md** - eBay Partner Network integration strategy
- **HEADPHONE_ADDITION_PROCESS.md** - Process for adding new components
- **OAUTH_SETUP_GUIDE.md** - OAuth configuration for scrapers
- **PROGRESSIVE_FILTER_DISCLOSURE.md** - Progressive disclosure design
- **SCRAPER_AUTOMATION.md** - Automated scraping setup
- **VERCEL_ENV_SETUP.md** - Vercel environment configuration

## Archive

Historical analysis and feasibility studies in `/archive`:

- **CASE_STUDY.md** - Project case study
- **COLOR_REFERENCE.md** - Design system color reference
- **CRINACLE_FORM_FACTOR_DATA.md** - Form factor data analysis
- **DATA_AUDIT_SOUND_SIGNATURES_USE_CASES.md** - Sound signature audit
- **FORM_FACTOR_FILTER_FEASIBILITY.md** - Filter feasibility study
- **SOUND_SIGNATURE_SOURCE_ANALYSIS.md** - Data source analysis
- **ASR_SCORING_IMPLEMENTATION.md** - Early ASR scoring (superseded by v3.5 scoring)
- **CHATBOT_INTEGRATION.md** - Recommendations chatbot (component removed)
- **DAC_AMP_CARD_REDESIGN.md** - 2025 DAC/amp card redesign notes
- **MANUFACTURER_LINKS_SESSION_NOTES.md** - Session notes
- **MIGRATION_SUMMARY_EBAY_AFFILIATE.md** - Completed eBay affiliate migration
- **PHASE1_PROGRESSIVE_DISCLOSURE_IMPLEMENTATION.md** - Filter UI implementation log
- **SCRAPER_UPSERT_UPDATE.md** - Scraper upsert change notes
- **SESSION_SUMMARY_2025-11-04.md** - Session notes
- **USED_LISTINGS_BUTTON_FIX.md** - One-off fix write-up
- **USED_MARKET_SETUP.md** - Original used-market setup (its npm scripts are retired)
- **V2_ALGORITHM_IMPLEMENTATION.md** - v2.0 algorithm (superseded; current scoring is in CLAUDE.md)

## Root Documentation

Essential docs remain in project root:
- **CLAUDE.md** - Claude Code project instructions, including the current
  recommendation scoring (source of truth: `src/app/api/recommendations/v2/route.ts`)
- **README.md** - Project readme
