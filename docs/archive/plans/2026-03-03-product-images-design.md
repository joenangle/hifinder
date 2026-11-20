# Product Images Design

**Date:** 2026-03-03
**Status:** Approved

## Problem

HiFinder's 560 audio components display as text-only cards with Lucide icon fallbacks. Product images would significantly improve visual polish and help users recognize products.

## Approach

Scrape product images from manufacturer pages → process (resize, WebP) → upload to Supabase Storage → store CDN URLs in the existing `image_url` column.

Three-tier sourcing:
1. **Manufacturer page scraping** (~60% coverage) — extract `og:image` or main product image
2. **Google Custom Search API** (~25%) — free tier, 100 queries/day, runs via cron
3. **Manual curation** (~15%) — flagged in CSV for manual lookup

## Key Decisions

- **Self-hosted in Supabase Storage** over hotlinking external URLs (reliability, single domain, consistent sizing)
- **Automated daily cron** via GitHub Actions stays within Google CSE free tier (95 queries/day)
- **Priority ordering** by `expert_grade_numeric` DESC across budget tiers — highest-impact products get images first
- **$0 total cost** — all within free tiers (Supabase Storage 1GB, Google CSE 100/day, GitHub Actions)

## Storage

- Supabase Storage `product-images` bucket (public read)
- Images: 400×400 max, WebP format, ~50KB each
- Total: ~28MB for 560 products
- Naming: `{brand-slug}-{model-slug}.webp`

## UI Integration

- 48×48 thumbnails on HeadphoneCard and SignalGearCard
- 120×120 image in ComponentDetailModal header
- Existing Lucide icon fallback preserved when `image_url` is null
