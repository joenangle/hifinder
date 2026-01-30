# Flagged Listings Management UI/UX Plan

**Created:** 2026-01-29
**Purpose:** Admin dashboard interface for reviewing and managing used listings that require manual intervention

---

## Executive Summary

**Current State:**
- 443 out of 1,000 listings (44.3%) flagged for review
- 254 ambiguous matches (25.4%)
- 232 low confidence matches (23.2%)
- All metadata populated: `match_confidence`, `requires_manual_review`, `validation_warnings`, `is_ambiguous`

**Goal:** Create an efficient admin workflow to review, approve, fix, or delete flagged listings.

---

## Data Model

### Existing Database Columns (used_listings table)

```sql
-- Core listing data
id, component_id, title, price, condition, source, url, date_posted, location
seller_username, description, images, status, created_at, updated_at

-- NEW quality metadata (populated by cleanup)
match_confidence      FLOAT      -- 0.0-1.0 score from matcher
requires_manual_review BOOLEAN    -- TRUE if flagged
validation_warnings    JSONB      -- Array of warning messages
is_ambiguous          BOOLEAN    -- TRUE if close alternatives exist
bundle_group_id       TEXT       -- Links bundle components
bundle_total_price    INTEGER    -- Original bundle price
bundle_component_count INTEGER   -- Number of components in bundle
bundle_position       INTEGER    -- Position within bundle
matched_segment       TEXT       -- Text segment that matched
```

### Flagging Reasons (validation_warnings examples)

Based on cleanup results, listings are flagged for:

1. **Low confidence (<0.5):** "Low confidence: 0.42"
2. **Ambiguous match:** "Ambiguous: HD600 (0.85) vs HD650 (0.83)"
3. **Price mismatch:** "Price >300% of MSRP" or "Price <20% of MSRP"
4. **Category conflict:** "IEM matched to headphone brand"
5. **Generic name:** "Generic brand/model name match"
6. **No match found:** "No match found with current logic"
7. **Accessory detected:** "Appears to be accessory-only"

---

## UI Design

### Tab Structure

Add a new tab to `/admin` page alongside existing tabs:

```
┌────────────────────────────────────────────────────────┐
│ Components Database | Add Component | Scraper Stats |  │
│ Component Candidates | Flagged Listings (443) ← NEW   │
└────────────────────────────────────────────────────────┘
```

**Badge:** Show count of pending flagged listings (same pattern as Component Candidates)

---

### Layout: Split View (3-column)

```
┌─────────────────────┬──────────────────┬─────────────────┐
│   Filters & Stats   │  Listings List   │  Detail Panel   │
│      (300px)        │     (500px)      │   (flexible)    │
└─────────────────────┴──────────────────┴─────────────────┘
```

#### Left Column: Filters & Stats (300px)

**Summary Stats (card):**
```
╔═══════════════════════════════════════╗
║  Flagged Listings Overview            ║
╠═══════════════════════════════════════╣
║  Total Pending:        443            ║
║  Ambiguous:            254 (57%)      ║
║  Low Confidence:       232 (52%)      ║
║  Price Issues:         XX (XX%)       ║
║  No Match:             XX (XX%)       ║
║                                       ║
║  Avg Confidence:       0.70           ║
╚═══════════════════════════════════════╝
```

**Filters:**
- **Status:** Pending / Approved / Rejected / All
- **Issue Type:** (multi-select)
  - Low Confidence (<0.5)
  - Ambiguous Match
  - Price Mismatch (>300% or <20%)
  - Category Conflict
  - Generic Name
  - No Match
  - Accessory Only
- **Confidence Range:** Slider (0.0 - 1.0)
- **Source:** Reddit, Reverb, eBay, All
- **Date Range:** Last 7 days, 30 days, 90 days, All time
- **Sort By:**
  - Confidence (asc/desc) ← default: asc (worst first)
  - Date Posted (newest/oldest)
  - Price (high/low)

**Quick Actions:**
- "Show only high priority" (confidence <0.3)
- "Clear all filters"

---

#### Middle Column: Listings List (500px, scrollable)

**List Item Design:**

```
┌─────────────────────────────────────────────────┐
│ 🔴 0.42 │ HiFiMAN Arya Stealth        │ $450  │ ← Header
├─────────────────────────────────────────────────┤
│ [WTS][US-CA][H] Hifiman Arya Stealth [W]...    │ ← Title (truncated)
│                                                 │
│ ⚠️  Low confidence: 0.42                        │ ← Warnings
│ ⚠️  Ambiguous: Arya (0.90) vs Arya Stealth...  │
│                                                 │
│ 📅 Posted 3 days ago  📍 California             │ ← Metadata
└─────────────────────────────────────────────────┘
```

**Visual Indicators:**
- **Confidence badge:** Color-coded
  - 🔴 Red: <0.5 (critical)
  - 🟡 Yellow: 0.5-0.7 (warning)
  - 🟢 Green: >0.7 (good, shouldn't be flagged unless other issues)
- **Warning icons:** ⚠️ for each validation warning
- **Selected state:** Ring border (similar to Component Candidates)
- **Hover state:** Background color change

**Pagination:** 20 items per page (performance consideration)

---

#### Right Column: Detail Panel (flexible width)

**Header Section:**
```
╔════════════════════════════════════════════════════╗
║ Listing Details                          [ X ] Close║
╠════════════════════════════════════════════════════╣
║ Match Confidence: 0.42 🔴                          ║
║ Status: Pending Review                             ║
╚════════════════════════════════════════════════════╝
```

**Sections:**

**1. Current Match Info (card)**
```
Component Matched: HiFiMAN Arya Stealth
Confidence: 0.42
Category: headphones
MSRP: $1,300

⚠️  Warnings (2):
  • Low confidence: 0.42
  • Ambiguous: Arya (0.90) vs Arya Stealth (0.85)
```

**2. Alternative Matches (if ambiguous) (card)**
```
Alternative Components:
┌─────────────────────────────────────────┐
│ ○ HiFiMAN Arya                  0.90    │ ← Radio button
│ ● HiFiMAN Arya Stealth (current) 0.85  │
│ ○ HiFiMAN Arya V3               0.80   │
└─────────────────────────────────────────┘

[Switch to Selected Component]
```

**3. Listing Details (card)**
```
Title: [WTS][US-CA][H] Hifiman Arya Stealth [W] PayPal $450
Price: $450
Condition: Excellent
Source: reddit_avexchange
Posted: 2026-01-26
Location: California, USA
Seller: @audiofile123

Description:
Selling my Hifiman Arya Stealth headphones in excellent condition.
Barely used, comes with original box and cable.

[View Original Listing ↗]
```

**4. Images (if available)**
```
[Image thumbnails]
```

**5. Actions (sticky footer)**
```
┌─────────────────────────────────────────────────┐
│ [✓ Approve]  [✗ Delete]  [✏️ Edit & Fix]       │
│                                                 │
│ Notes (optional):                               │
│ ┌─────────────────────────────────────────────┐ │
│ │ Reason for approval/rejection...            │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## User Workflows

### 1. Review & Approve (Simple Case)

**Scenario:** Listing is flagged as low confidence (0.68) but match looks correct

1. User clicks listing from middle column
2. Reviews component match, price, title
3. Confirms match is correct
4. Clicks "✓ Approve"
5. System updates:
   - `requires_manual_review = FALSE`
   - `manual_review_notes = "Approved by admin"`
   - `reviewed_by = user_email`
   - `reviewed_at = NOW()`
6. Listing disappears from "Pending" filter
7. Next listing auto-selected

**Keyboard shortcut:** `A` for approve

---

### 2. Fix & Re-match (Ambiguous Case)

**Scenario:** Listing matched to wrong component, better alternative exists

1. User clicks listing
2. Sees "Alternative Matches" section with better option
3. Selects correct component (radio button)
4. Clicks "Switch to Selected Component"
5. System updates:
   - `component_id = new_component_id`
   - `match_confidence = new_confidence`
   - `requires_manual_review = FALSE`
   - `validation_warnings = ["Manually corrected: was X, now Y"]`
6. Success message: "Match updated successfully"

**Alternative flow:** If none of the alternatives are correct:
- Click "Manual Search" button
- Search bar appears
- Type component name
- Select from dropdown
- Confirm selection

---

### 3. Delete (False Positive)

**Scenario:** Listing is completely wrong (e.g., Sony camera matched to headphones)

1. User clicks listing
2. Reviews details, confirms it's wrong
3. Clicks "✗ Delete"
4. Confirmation modal: "Are you sure? This will permanently delete the listing."
5. Optional: Add reason: "Wrong category - camera not audio equipment"
6. Click "Confirm Delete"
7. System:
   - Sets `status = 'deleted'` (soft delete, not hard delete)
   - Records `deleted_by`, `deleted_at`, `deletion_reason`
8. Listing disappears from view

**Keyboard shortcut:** `D` for delete (with confirmation)

---

### 4. Bulk Actions (Power User Feature)

**Scenario:** Admin wants to delete all listings with specific issue

1. Add checkboxes to listing cards
2. "Select All" / "Select Visible" buttons
3. Bulk action dropdown: "Delete Selected", "Approve Selected"
4. Confirmation modal shows count: "Delete 15 selected listings?"
5. Execute action on all selected

---

## API Endpoints (Backend)

```typescript
// GET /api/admin/flagged-listings
// Query params: status, issueType[], confidenceMin, confidenceMax, source, dateFrom, dateTo, sortBy, sortOrder, page, limit
// Returns: { listings: [], pagination: {}, summary: {} }

// GET /api/admin/flagged-listings/[id]
// Returns: { listing: {}, alternatives: [], triggeringListings: [] }

// PATCH /api/admin/flagged-listings/[id]
// Body: { action: 'approve' | 'delete' | 'fix', notes?: string, newComponentId?: string }
// Returns: { success: boolean, message: string }

// POST /api/admin/flagged-listings/bulk
// Body: { listingIds: [], action: 'approve' | 'delete', notes?: string }
// Returns: { success: boolean, processed: number, failed: number }

// GET /api/admin/flagged-listings/stats
// Returns: { total, byIssueType, avgConfidence, etc. }
```

---

## Database Schema Additions

Add columns for tracking manual review:

```sql
ALTER TABLE used_listings
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS manual_review_notes TEXT;

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_used_listings_flagged
  ON used_listings(requires_manual_review, match_confidence)
  WHERE requires_manual_review = TRUE;
```

---

## Progressive Enhancement Ideas

### Phase 1: Basic Review Interface (MVP)
- List view with filters
- Detail panel
- Approve/Delete actions
- Manual component switching

### Phase 2: Efficiency Features
- Keyboard shortcuts (A=approve, D=delete, →=next, ←=previous)
- Auto-advance to next item after action
- Bulk actions
- Export flagged listings to CSV
- Review history log

### Phase 3: Smart Features
- AI-assisted suggestions: "This looks like it should be X instead"
- Auto-approve listings with confidence >0.8 and no other issues
- Pattern detection: "10 listings from same seller have low confidence - possible scraping issue"
- Review analytics: Time spent, approval rate, most common issues

### Phase 4: Advanced Admin Tools
- Inline editing (change price, condition, description)
- Image upload/edit
- Seller reputation tracking
- Duplicate detection across listings

---

## Key Design Principles

1. **Speed:** Admin should be able to review 20-30 listings in 5-10 minutes
2. **Context:** All relevant info visible without scrolling
3. **Safety:** Destructive actions require confirmation
4. **Transparency:** Clear why each listing was flagged
5. **Flexibility:** Multiple ways to fix issues (switch component, manual search, edit, delete)
6. **Tracking:** Log all manual interventions for audit trail

---

## Success Metrics

**Initial (Week 1):**
- Can review 30 listings/10 minutes (2 mins per listing)
- <5% actions requiring undo
- All 443 flagged listings reviewed within 2-3 hours total

**Ongoing:**
- New flagged listings reviewed within 24 hours
- <10% of listings require manual review after matcher improvements
- Admin spends <30 min/week on manual review

---

## Implementation Checklist

### Backend
- [ ] Create `/api/admin/flagged-listings` endpoint
- [ ] Create `/api/admin/flagged-listings/[id]` endpoint
- [ ] Create PATCH endpoint for approve/delete/fix actions
- [ ] Create bulk actions endpoint
- [ ] Create stats endpoint
- [ ] Add database columns for review tracking
- [ ] Add indexes for performance

### Frontend
- [ ] Create `FlaggedListingsTab` component
- [ ] Create filters sidebar
- [ ] Create listings list view
- [ ] Create detail panel
- [ ] Create alternative matches UI
- [ ] Create action buttons with confirmations
- [ ] Add keyboard shortcuts
- [ ] Add success/error toast messages
- [ ] Add pagination
- [ ] Test on 443 real flagged listings

### Testing
- [ ] Test approve flow (confidence updates correctly)
- [ ] Test delete flow (soft delete, not hard delete)
- [ ] Test fix/re-match flow (component_id updates)
- [ ] Test bulk actions (multiple listings at once)
- [ ] Test filters (correct listings shown)
- [ ] Test pagination (performance with 443 items)
- [ ] Test keyboard shortcuts
- [ ] Test mobile responsiveness (admin may review on tablet)

---

## Next Steps

1. **Review this plan** with user for feedback/adjustments
2. **Prioritize features** (MVP vs nice-to-have)
3. **Design mockups** (optional, can build directly from this spec)
4. **Implement backend APIs** first (test with Postman/curl)
5. **Build frontend components** incrementally
6. **Test with real data** (443 flagged listings)
7. **Iterate based on usage** (add bulk actions if needed, etc.)

---

## Notes & Considerations

**Alternative Approach: Extend Component Candidates Tab**

Instead of a new tab, could add a "Type" filter to Component Candidates:
- **New Components** (existing functionality)
- **Flagged Listings** (new functionality)

**Pros:** Single interface for all manual review
**Cons:** Different data models (new_component_candidates vs used_listings), might be confusing

**Recommendation:** Separate tab for now, clearer separation of concerns. Can merge later if workflows converge.

---

**End of Plan**
