# Marketplace Redesign: Days 3-4 Plan

## Branch: `feature/marketplace-redesign`

---

## ✅ Days 1-2 Completed (Nov 11, 2025)

### Day 1: Foundation & Migration
- ✅ Renamed UsedMarket → Marketplace everywhere (routes, components, references)
- ✅ Updated navigation, URLs, and internal links
- ✅ List view with table headers implementation
- ✅ Grid/List view toggle moved next to Filters button
- ✅ Removed eBay from sources filter (affiliate-only strategy)
- ✅ Fixed price filter debouncing (no more refresh per digit)

### Day 2: Bug Fixes & Polish
- ✅ Fixed images not loading (ImageCarousel error handling with placeholders)
- ✅ Fixed grid view spacing issues (min-w-0, flex-shrink-0, tooltips)
- ✅ Fixed inappropriate images from Reddit scraper (disabled regex extraction)
- ✅ Simplified list view images (clickable thumbnails instead of carousel)
- ✅ Improved button layout (horizontal row instead of stacked)
- ✅ Removed redundant thread titles
- ✅ **Image viewer modal** - Click list view thumbnails to see full carousel
- ✅ Investigated Reverb images (API limitation documented)

**Commits:**
- `bac59e4` - Add image viewer modal for marketplace listings
- `c076091` - UI: Remove redundant titles & put buttons in one row
- `bb490b0` - Fix: List view shows simple thumbnail instead of carousel
- `e8d4cc6` - Fix: Disable regex-based image extraction
- `c345399` - Fix: ImageCarousel placeholders
- `53f7846` - Fix: Grid view spacing and image placeholders
- `c75ccff` - Complete UsedMarket → Marketplace migration

---

## 📋 Day 3: Enhanced Filtering & Search (Proposed)

**Goal:** Make it easier to discover and narrow down listings

### A. Search Functionality
- [ ] **Search bar implementation** (currently commented out)
  - Search by brand, model, seller username
  - Debounced input (500ms)
  - Clear button when search active
  - Client-side filtering (fast) or server-side (accurate) - TBD

### B. Advanced Filters
- [ ] **Category filter** (Headphones, IEMs, DACs, Amps, Combos)
  - Multi-select checkboxes
  - Show count per category
  - Badge showing active filters count

- [ ] **Location filtering**
  - Dropdown or autocomplete for US states/countries
  - Group by region (US, Canada, EU, Asia, etc.)
  - Show "Ships from" prominently

- [ ] **Deal quality filter**
  - "Great Deals Only" toggle (>25% below market)
  - "Good Deals" filter (10-25% below market)
  - Hide overpriced listings option

### C. Filter UX Improvements
- [ ] **Active filters summary bar**
  - Show all active filters with X to remove
  - "Clear All Filters" button
  - Persistent across page refreshes (URL params)

- [ ] **Filter presets**
  - "Hot Deals" (great deals, posted <48h)
  - "Near Me" (location-based)
  - "Budget Picks" (price <$200)
  - Save custom filter sets (future)

**Time estimate:** 4-6 hours
**Priority:** High - Core discovery feature

---

## 📋 Day 4: Data Quality & Scraper Fixes (Proposed)

**Goal:** Improve listing accuracy and data reliability

### A. Fuzzy Matching Improvements
- [ ] **Fix soundcard matching issue** (T3 Plus matching AE-5)
  - Review fuzzy matching threshold (currently 80%)
  - Add category validation (IEMs shouldn't match sound cards)
  - Whitelist/blacklist system for known problematic matches
  - Test with 20+ edge cases

### B. Reddit Scraper Enhancements
- [ ] **Better sold detection**
  - Check flair for "closed", "sold", "complete"
  - Parse title for [SOLD], (SOLD), "SPF"
  - Mark expired listings (>30 days old)
  - Archive sold listings instead of deleting

- [ ] **Price extraction improvements**
  - Handle "$400 OBO" (or best offer)
  - Handle "$400 shipped" vs "$400 + shipping"
  - Extract individual item prices from bundle posts
  - Validate price against component database (flag outliers)

### C. Reverb Image Loading
- [ ] **Implement photo fetching strategy** (if high priority)
  - Option 1: Accept placeholders (current state)
  - Option 2: Batch fetch individual listing details for photos (slow, API intensive)
  - Option 3: Research Reverb API for photo inclusion parameter
  - **Recommended:** Option 1 for now, revisit if user complaints

### D. Data Quality Dashboard
- [ ] **Admin stats page** (`/admin/marketplace-stats`)
  - Listings by source (Reddit: X, Reverb: Y)
  - Match success rate (matched vs unmatched)
  - Image coverage (% with images)
  - Price outliers flagged for review
  - Scraper health (last run, errors, rate limits)

**Time estimate:** 4-6 hours
**Priority:** Medium-High - Improves trust and accuracy

---

## 🎯 Alternative Focus: Mobile Optimization

If data quality isn't urgent, focus on mobile UX instead:

### Day 3-4: Mobile-First Improvements
- [ ] **Responsive grid adjustments**
  - 1 col on mobile, 2 on tablet, 3-4 on desktop
  - Larger touch targets for thumbnails
  - Swipeable image carousel on cards

- [ ] **Mobile filters drawer**
  - Bottom sheet instead of sidebar
  - Sticky "Apply Filters" button
  - Filter chips showing active selections

- [ ] **List view optimization for mobile**
  - Hide less important columns (deal %, seller)
  - Stack info vertically on narrow screens
  - Expand row on tap for full details

**Time estimate:** 4-6 hours
**Priority:** High - 40%+ mobile traffic expected

---

## 📝 Known Issues & Tech Debt

### Low Priority (Backlog)
- ⚠️ Reverb images (API limitation) - Accept placeholders for now
- ⚠️ eBay listings - Affiliate-only strategy, no scraping
- ⚠️ Head-Fi scraper - JS-rendered content, blocked without Puppeteer
- 🔄 Performance optimization - Infinite scroll works, but could cache better
- 🔄 SEO/OG tags - Add meta tags for better sharing
- 🔄 Analytics - Track filter usage, popular searches

---

## 💡 Quick Wins (< 1 hour each)

**If you need filler tasks or waiting on decisions:**

1. **Loading states** - Add skeleton screens for listing cards
2. **Empty states** - Better messaging when filters return 0 results
3. **Error handling** - Graceful API failure messages
4. **Keyboard shortcuts** - ESC to close filters, / to focus search
5. **Tooltips** - Explain condition ratings, deal percentages
6. **Sort persistence** - Remember user's last sort preference
7. **Image zoom** - Click image in modal to zoom further
8. **Copy link button** - Share specific listings easily

---

## 🚀 Recommendation

**Day 3:** Enhanced Filtering & Search (A + B + C)
**Day 4:** Data Quality & Scraper Fixes (A + B + C)

This balances user-facing improvements (Day 3) with backend reliability (Day 4). Both are high-impact and address current pain points.

**Alternative if Joe prefers:**
**Days 3-4:** Mobile Optimization (responsive, filters, list view) - More visible impact for broader audience

---

## Notes
- All improvements should be committed incrementally with clear messages
- Test on both localhost:3000 and staging.hifinder.app before pushing
- Update this plan as priorities shift
- Mark completed items with ✅ and commit hash

