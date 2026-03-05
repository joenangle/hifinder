# Product Images Site Integration Plan

## Context

We've built a product image pipeline that scrapes, processes, and uploads product images to Supabase Storage. Current status:
- **306/710 products** have images (43%), with daily cron adding ~100/day
- Images are 800x800 max WebP, hosted on Supabase CDN
- IEMs: 66% covered, Headphones: 35%, DACs/Amps: ~0% (in queue)
- Pipeline: `scripts/populate-product-images.js` (DuckDuckGo image search, no API keys)
- Images already display as small 48x48 thumbnails on recommendation cards and 80x80 in the detail modal

## Current Image Touchpoints

| Location | Size | Status |
|----------|------|--------|
| HeadphoneCard (`/recommendations`) | 48x48 | Implemented — tiny thumbnail |
| SignalGearCard (`/recommendations`) | 48x48 | Implemented — tiny thumbnail |
| ComponentDetailModal (various) | 80x80 | Implemented — small header image |
| Gear page (`/gear`) | 80x80 | Implemented — collection items |
| Marketplace cards (`/marketplace`) | None | Not implemented |
| Landing page (`/`) | Static hero only | No product images |

## Task

Design and implement how product images should be used across the entire site. The images are now 800x800 — much larger than the current tiny thumbnails. Consider:

### Areas to Address

1. **Recommendation cards** — Currently 48x48 thumbnails alongside text. Could be larger, more prominent. Cards are the primary browsing interface.

2. **Component detail modal** — Currently 80x80 in the header. This is where users make purchase decisions. Could have a much larger product showcase image.

3. **Gear page** — User's collection display. Product images make collections feel more personal and visual.

4. **Marketplace listings** — Currently text-only cards. Has an unused `ImageCarousel` component ready for `listing.images[]`.

5. **Landing page** — Currently has a static hero image. Could showcase actual product images from the database to make the page feel more dynamic.

6. **Graceful degradation** — ~57% of products still lack images. Fallback icons exist (Headphones, Ear, Disc3, Cable, Combine from lucide-react) but need to look good at any size.

### Key Files

- `src/components/recommendations/HeadphoneCard.tsx` — IEM/headphone recommendation card
- `src/components/recommendations/SignalGearCard.tsx` — DAC/amp recommendation card
- `src/components/ComponentDetailModal.tsx` — Product detail modal
- `src/components/LandingPage.tsx` — Landing/hero page
- `src/app/gear/page.tsx` — User gear collection
- `src/components/MarketplaceListingCard.tsx` — Marketplace listing cards
- `src/components/ImageCarousel.tsx` — Existing carousel component (unused)
- `src/styles/design-system-variables.css` — Design tokens
- `src/styles/design-system-components.css` — Component styles
- `next.config.ts` — Image domain allowlist (Supabase already configured)

### Constraints

- Next.js 16, React 19, Tailwind CSS v4
- `next/image` component already used everywhere
- Dark mode support required (CSS variables)
- Mobile-responsive (cards stack on mobile)
- React Compiler enabled (no manual memoization needed)
- Images may be product-on-white-background, product-in-context, or occasionally low quality — design should be forgiving of varied image quality
