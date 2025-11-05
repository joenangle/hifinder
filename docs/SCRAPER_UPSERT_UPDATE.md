# Scraper Status Update Implementation

**Date:** November 5, 2025
**Issue:** Listings with (CLOSED) flair were remaining marked as "available" in database

## Problem

The Reddit scraper was using **insert-only** logic:
- Check if URL exists in database
- If exists → skip entirely
- If new → insert

This meant that when a listing's status changed on Reddit (e.g., seller updated flair to "CLOSED"), the scraper would find the URL already in the database and skip it without updating the status.

## Solution

Changed from insert-only to **upsert** (insert or update) pattern:
- Scraper processes all listings found in search results
- Uses Supabase `upsert()` with `onConflict: 'url'`
- New listings → inserted
- Existing listings → updated with current data (status, price, bot confirmation, etc.)

## Changes Made

### 1. Database Migration

**File:** `supabase/migrations/20251105_add_url_unique_constraint.sql`

- Added `UNIQUE` constraint on `url` column (required for upsert)
- Cleaned up any existing duplicate URLs (kept most recent)
- Added index for faster URL lookups
- Safe migration with conditional logic (checks before adding constraint)

**Status:** ✅ Successfully run

### 2. Scraper Code Updates

**File:** `scripts/reddit-avexchange-scraper.js`

#### Location 1: Lines 397-417 (Main processing loop)
**Before:**
```javascript
// Check if listing already exists (by URL)
const { data: existing } = await supabase
  .from('used_listings')
  .select('id')
  .eq('url', listing.url)
  .single();

if (!existing) {
  // Insert new listing
  const { error: insertError } = await supabase
    .from('used_listings')
    .insert(listing);
  // ...
}
```

**After:**
```javascript
// Upsert listing - will insert if new or update if URL exists
const { data: upsertResult, error: upsertError } = await supabase
  .from('used_listings')
  .upsert(listing, {
    onConflict: 'url',
    ignoreDuplicates: false
  })
  .select('id, url');
```

#### Location 2: Lines 822-840 (saveListingsToDatabase function)
Same pattern - replaced skip-if-exists logic with upsert.

### 3. Helper Script (Optional)

**File:** `scripts/run-migration-url-constraint.js`

Created for programmatic migration execution (though manual SQL Editor approach was used instead).

## How It Works Now

### Scheduled Scraper Run:
1. Searches Reddit for components (past month, 100 results per query)
2. For each Reddit post found:
   - Extracts current status from flair/title (checks for "closed", "sold", etc.)
   - If appears sold → checks for AVExchangeBot confirmation
   - Parses all listing data (price, seller, condition, etc.)
3. **Upserts to database:**
   - If URL is new → inserts new row
   - If URL exists → **updates existing row with current data**
4. Status updates happen automatically on each scraper run

### What Gets Updated:
- `status` (available → sold/expired/removed)
- `price` (if price changed)
- `title` (if edited)
- `date_sold` (if bot confirmation found)
- `buyer_username` (from bot confirmation)
- `avexchange_bot_confirmed` (TRUE when both parties replied to bot)
- `seller_feedback_given`, `buyer_feedback_given` (bot reply tracking)
- `avexchange_bot_comment_id` (for tracking confirmation source)

## Benefits

1. **Automatic Status Tracking:** No separate update script needed
2. **Accurate Availability:** Used listings reflect current Reddit status
3. **Better Price History:** Price changes tracked over time via updates
4. **Bot Verification:** Confirmed sales updated when verification appears
5. **Single Responsibility:** One scraper handles both discovery and updates

## Testing

To verify the fix works for your reported issue:

1. Run scraper: `node scripts/reddit-avexchange-scraper.js`
2. Check the example listing you reported:
   - URL: https://www.reddit.com/r/AVexchange/comments/1omzcn5/...
   - Should now show status "sold" or "expired" (not "available")
3. Verify in admin dashboard: http://localhost:3000/test
   - Recent listings should reflect current Reddit status
   - Bot-verified count should increase as confirmations are found

## Next Scheduled Run

The scraper is already scheduled to run periodically. Next run will automatically:
- Update ~179 existing listings with current status
- Add any new listings posted since last run
- Check for AVExchangeBot confirmations on sold items

## Related Files

- `/scripts/reddit-avexchange-scraper.js` - Main scraper with upsert logic
- `/scripts/monitor-avexchange-confirmations.js` - Standalone bot monitor (optional)
- `/supabase/migrations/20251105_add_url_unique_constraint.sql` - Database schema
- `/src/app/test/page.tsx` - Admin dashboard for monitoring
- `/src/app/api/admin/scraper-stats/route.ts` - Stats API endpoint

## Documentation Updates

Added to `CLAUDE.md`:
- Scraper now uses upsert pattern for automatic status updates
- Single scheduled job handles both new listings and status updates
- No separate update script required
